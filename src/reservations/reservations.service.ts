import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { calculateReservationPrice } from '../common/pricing';

// Parkings have no time zone of their own yet, so reminders use one for all.
const DEFAULT_TIME_ZONE = 'Europe/Rome';
  
  @Injectable()
  export class ReservationsService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly notifications: NotificationsService,
      private readonly payments: PaymentsService,
    ) {}
  
    async create(
        userId: number,
        createReservationDto: CreateReservationDto,
      ) {
        const {
          parkingId,
          vehicleId,
          startDatetime,
          endDatetime,
        } = createReservationDto;
      
        const start = new Date(startDatetime);
        const end = new Date(endDatetime);
      
        // 1. Validar fechas
      
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new BadRequestException('Fechas inválidas');
        }
      
        if (start >= end) {
          throw new BadRequestException(
            'La fecha de inicio debe ser anterior a la fecha de finalización',
          );
        }

        if (end.getTime() - start.getTime() < 60 * 60 * 1000) {
          throw new BadRequestException(
            'La reserva debe tener una duración mínima de una hora',
          );
        }

        const reservation = await this.prisma.$transaction(async (tx) => {
          // Lock the parking row so concurrent requests for the same parking
          // run one after another; otherwise two of them could both pass the
          // overlap check below and double-book the slot.
          await tx.$queryRaw`SELECT id FROM "Parking" WHERE id = ${parkingId} FOR UPDATE`;

          const parking = await tx.parking.findUnique({ where: { id: parkingId } });
          if (!parking) {
            throw new NotFoundException('Parking no encontrado');
          }
          if (!parking.active) {
            throw new BadRequestException('El parking no está activo');
          }
          if (parking.parkingStatus !== 'AVAILABLE') {
            throw new BadRequestException('El parking no está disponible');
          }

          if (vehicleId) {
            const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, userId } });
            if (!vehicle) {
              throw new NotFoundException('Vehículo no encontrado');
            }
          }

          // Unpaid holds that ran out no longer block the slot.
          const now = new Date();
          await tx.reservation.updateMany({
            where: { parkingId, status: 'PENDING', expiresAt: { lt: now } },
            data: { status: 'EXPIRED' },
          });

          const overlappingReservation = await tx.reservation.findFirst({
            where: {
              parkingId,
              status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
              startDatetime: { lt: end },
              endDatetime: { gt: start },
            },
          });
          if (overlappingReservation) {
            throw new BadRequestException('El parking ya está reservado en ese horario');
          }

          return tx.reservation.create({
            data: {
              parkingId,
              userId,
              vehicleId,
              startDatetime: start,
              endDatetime: end,
              totalPrice: calculateReservationPrice(start, end, parking.pricePerHour),
              currency: parking.currency,
              status: 'PENDING',
              expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
            },
          });
        });
        console.log('[reservations] Reservation created', { reservationId: reservation.id, userId, parkingId });
        return reservation;
      }
  async findAll(userId: number) {
        await this.completeEndedReservations();
        return this.prisma.reservation.findMany({
          where: { OR: [{ userId }, { parking: { ownerId: userId } }] },
          include: {
            parking: true,
            vehicle: true,
            payment: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: {
            startDatetime: 'desc',
          },
        });
      }
  async findOne(userId: number, reservationId: number) {
        await this.completeEndedReservations();
        const reservation = await this.prisma.reservation.findFirst({
          where: {
            id: reservationId,
            OR: [{ userId }, { parking: { ownerId: userId } }],
          },
          include: {
            parking: true,
            vehicle: true,
            payment: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        });
      
        if (!reservation) {
          throw new NotFoundException(
            'Reserva no encontrada',
          );
        }
      
        return reservation;
      }
      async cancel(userId: number, reservationId: number) {
        const reservation =
          await this.prisma.reservation.findFirst({
            where: {
              id: reservationId,
              userId,
            },
          });
      
        if (!reservation) {
          throw new NotFoundException(
            'Reserva no encontrada',
          );
        }
      
        // Only unpaid reservations can be cancelled: there is no refund flow yet,
        // so cancelling a CONFIRMED one would keep the customer's money. The
        // status is part of the write so a payment landing meanwhile wins.
        const cancelled = await this.prisma.reservation.updateMany({
          where: { id: reservationId, userId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        if (cancelled.count !== 1) {
          throw new BadRequestException(
            'La reserva no puede ser cancelada',
          );
        }

        await this.payments.cancelPendingPaymentIntent(reservationId);
        return this.prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
      }

      async findForParking(ownerId: number, parkingId: number) {
        await this.completeEndedReservations();
        const parking = await this.prisma.parking.findFirst({ where: { id: parkingId, ownerId } });
        if (!parking) throw new NotFoundException('Parking no encontrado');

        return this.prisma.reservation.findMany({
          where: { parkingId },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            vehicle: true,
            parking: true,
          },
          orderBy: { startDatetime: 'desc' },
        });
      }

      async findUpcomingForHome(userId: number) {
        await this.completeEndedReservations();
        const now = new Date();
        const reservation = await this.prisma.reservation.findFirst({
          where: {
            status: { in: ['CONFIRMED', 'ACTIVE'] },
            startDatetime: { lte: new Date(now.getTime() + 10 * 60 * 1000) },
            endDatetime: { gte: now },
            OR: [{ userId }, { parking: { ownerId: userId } }],
          },
          include: {
            parking: true,
            vehicle: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { startDatetime: 'asc' },
        });
        console.log('[reservations] Upcoming reservation lookup', {
          userId,
          found: Boolean(reservation),
          reservationId: reservation?.id,
          status: reservation?.status,
        });
        return reservation;
      }

      async confirmCustomerStart(userId: number, reservationId: number) {
        const reservation = await this.prisma.reservation.findFirst({ where: { id: reservationId, userId }, include: { parking: true } });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');
        return this.confirmStart(reservation, 'customer');
      }

      async confirmOwnerStart(userId: number, reservationId: number) {
        const reservation = await this.prisma.reservation.findFirst({
          where: { id: reservationId, parking: { ownerId: userId } }, include: { parking: true },
        });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');
        return this.confirmStart(reservation, 'owner');
      }

      private async confirmStart(reservation: { id: number; userId: number; status: string; endDatetime: Date; startDatetime: Date; customerStartedAt: Date | null; ownerStartedAt: Date | null; parking: { ownerId: number } }, role: 'customer' | 'owner') {
        if (reservation.status !== 'CONFIRMED') {
          throw new BadRequestException('La reserva no está lista para iniciarse');
        }
        if (reservation.endDatetime <= new Date()) {
          await this.completeEndedReservations();
          throw new BadRequestException('La reserva ya finalizó');
        }

        if (reservation.startDatetime.getTime() - Date.now() > 10 * 60 * 1000) {
          throw new BadRequestException('La reserva solo puede iniciarse 10 minutos antes de su horario');
        }

        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
          // updateMany only writes the acknowledgement once. Reading after that
          // write prevents two nearly simultaneous confirmations from leaving a
          // reservation confirmed even though both parties accepted it.
          await tx.reservation.updateMany({
            where: {
              id: reservation.id,
              status: 'CONFIRMED',
              ...(role === 'customer'
                ? { customerStartedAt: null }
                : { ownerStartedAt: null }),
            },
            data: role === 'customer'
              ? { customerStartedAt: now }
              : { ownerStartedAt: now },
          });

          const current = await tx.reservation.findUnique({
            where: { id: reservation.id },
            select: {
              status: true,
              customerStartedAt: true,
              ownerStartedAt: true,
              startedAt: true,
            },
          });
          if (!current) throw new NotFoundException('Reserva no encontrada');

          if (
            current.status === 'CONFIRMED' &&
            current.customerStartedAt &&
            current.ownerStartedAt
          ) {
            await tx.reservation.update({
              where: { id: reservation.id },
              data: { status: 'ACTIVE', startedAt: current.startedAt ?? now },
            });
          }
        });

        return this.prisma.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
          include: {
            parking: true,
            vehicle: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            payment: true,
          },
        });
      }

      @Cron('0 * * * * *')
      async completeEndedReservations() {
        await this.prisma.reservation.updateMany({
          where: { status: { in: ['CONFIRMED', 'ACTIVE'] }, endDatetime: { lte: new Date() } },
          data: { status: 'COMPLETED' },
        });
      }

      @Cron('0 * * * * *')
      async sendScheduledReminders() {
        const now = new Date();
        for (const minutes of [30, 10]) {
          const target = new Date(now.getTime() + minutes * 60 * 1000);
          const reservations = await this.prisma.reservation.findMany({
            where: { status: 'CONFIRMED', startDatetime: { gte: new Date(target.getTime() - 30_000), lt: new Date(target.getTime() + 30_000) } },
            include: { parking: true, vehicle: true },
          });
          await Promise.all(reservations.flatMap((reservation) => {
            const schedule = reservation.startDatetime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE });
            const vehicle = reservation.vehicle ? ` · ${reservation.vehicle.licensePlate}` : '';
            const body = `${reservation.parking.title} · ${schedule}${vehicle}`;
            return [
              this.notifications.sendReservationReminder(reservation.userId, 'Próxima reserva', body, reservation.id),
              this.notifications.sendReservationReminder(reservation.parking.ownerId, 'Próxima reserva', body, reservation.id),
            ];
          }));
        }
      }
  }
