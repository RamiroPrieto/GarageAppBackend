import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
  
  @Injectable()
  export class ReservationsService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly notifications: NotificationsService,
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
      
        // 2. Buscar parking
      
        const parking = await this.prisma.parking.findUnique({
          where: {
            id: parkingId,
          },
        });
      
        if (!parking) {
          throw new NotFoundException(
            'Parking no encontrado',
          );
        }
      
        // 3. Verificar que esté activo
      
        if (!parking.active) {
          throw new BadRequestException(
            'El parking no está activo',
          );
        }
      
        // 4. Verificar estado del parking
      
        if (parking.parkingStatus !== 'AVAILABLE') {
          throw new BadRequestException(
            'El parking no está disponible',
          );
        }
      
        // 5. Verificar vehículo
      
        if (vehicleId) {
          const vehicle = await this.prisma.vehicle.findFirst({
            where: {
              id: vehicleId,
              userId,
            },
          });
      
          if (!vehicle) {
            throw new NotFoundException(
              'Vehículo no encontrado',
            );
          }
        }
      
        // 6. Eliminar conceptualmente reservas PENDING expiradas
        //
        // No necesitamos borrarlas.
        // Las marcamos como EXPIRED.
      
        const now = new Date();
      
        await this.prisma.reservation.updateMany({
          where: {
            parkingId,
            status: 'PENDING',
            expiresAt: {
              lt: now,
            },
          },
          data: {
            status: 'EXPIRED',
          },
        });
      
        // 7. Buscar reservas que se superpongan
      
        const overlappingReservation =
          await this.prisma.reservation.findFirst({
            where: {
              parkingId,
      
              status: {
                    in: ['PENDING', 'CONFIRMED', 'ACTIVE'],
              },
      
              startDatetime: {
                lt: end,
              },
      
              endDatetime: {
                gt: start,
              },
            },
          });
      
        if (overlappingReservation) {
          throw new BadRequestException(
            'El parking ya está reservado en ese horario',
          );
        }
      
        // 8. Calcular precio
      
        const durationInHours =
          (end.getTime() - start.getTime()) /
          (1000 * 60 * 60);
      
        const totalPrice =
          durationInHours *
          Number(parking.pricePerHour);
      
        // 9. Crear reserva PENDING
      
        const expiresAt = new Date(
          now.getTime() + 10 * 60 * 1000,
        );
      
        return this.prisma.reservation.create({
          data: {
            parkingId,
            userId,
            vehicleId,
      
            startDatetime: start,
            endDatetime: end,
      
            totalPrice,
            currency: parking.currency,
      
            status: 'PENDING',
      
            expiresAt,
          },
        });
      }
  async findAll(userId: number) {
        await this.completeEndedReservations();
        return this.prisma.reservation.findMany({
          where: {
            userId,
          },
          include: {
            parking: {
              include: {
                photos: {
                  orderBy: {
                    displayOrder: 'asc',
                  },
                },
              },
            },
            vehicle: true,
            payment: true,
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
            userId,
          },
          include: {
            parking: {
              include: {
                photos: {
                  orderBy: {
                    displayOrder: 'asc',
                  },
                },
              },
            },
            vehicle: true,
            payment: true,
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
      
        if (
          reservation.status !== 'PENDING' &&
          reservation.status !== 'CONFIRMED'
        ) {
          throw new BadRequestException(
            'La reserva no puede ser cancelada',
          );
        }
      
        return this.prisma.reservation.update({
          where: {
            id: reservationId,
          },
          data: {
            status: 'CANCELLED',
          },
        });
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
            parking: { include: { photos: { orderBy: { displayOrder: 'asc' } } } },
          },
          orderBy: { startDatetime: 'desc' },
        });
      }

      async findUpcomingForHome(userId: number) {
        await this.completeEndedReservations();
        const now = new Date();
        return this.prisma.reservation.findFirst({
          where: {
            status: { in: ['CONFIRMED', 'ACTIVE'] },
            startDatetime: { lte: new Date(now.getTime() + 10 * 60 * 1000) },
            endDatetime: { gte: now },
            OR: [{ userId }, { parking: { ownerId: userId } }],
          },
          include: {
            parking: { include: { photos: { orderBy: { displayOrder: 'asc' } } } },
            vehicle: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { startDatetime: 'asc' },
        });
      }

      async confirmCustomerStart(userId: number, reservationId: number) {
        const reservation = await this.prisma.reservation.findFirst({ where: { id: reservationId, userId } });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');
        return this.confirmStart(reservation, 'customer');
      }

      async confirmOwnerStart(userId: number, reservationId: number) {
        const reservation = await this.prisma.reservation.findFirst({
          where: { id: reservationId, parking: { ownerId: userId } },
        });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');
        return this.confirmStart(reservation, 'owner');
      }

      private async confirmStart(reservation: { id: number; status: string; endDatetime: Date; customerStartedAt: Date | null; ownerStartedAt: Date | null }, role: 'customer' | 'owner') {
        if (reservation.status !== 'CONFIRMED') {
          throw new BadRequestException('La reserva no está lista para iniciarse');
        }
        if (reservation.endDatetime <= new Date()) {
          await this.completeEndedReservations();
          throw new BadRequestException('La reserva ya finalizó');
        }

        const now = new Date();
        const customerStartedAt = role === 'customer' ? reservation.customerStartedAt ?? now : reservation.customerStartedAt;
        const ownerStartedAt = role === 'owner' ? reservation.ownerStartedAt ?? now : reservation.ownerStartedAt;
        return this.prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            ...(role === 'customer' ? { customerStartedAt } : { ownerStartedAt }),
            ...(customerStartedAt && ownerStartedAt ? { status: 'ACTIVE', startedAt: now } : {}),
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
            where: { status: 'CONFIRMED', startDatetime: { gte: new Date(target.getTime() - 30_000), lte: new Date(target.getTime() + 30_000) } },
            include: { parking: true, vehicle: true },
          });
          await Promise.all(reservations.flatMap((reservation) => {
            const schedule = reservation.startDatetime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
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
