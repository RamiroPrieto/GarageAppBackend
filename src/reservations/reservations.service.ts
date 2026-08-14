import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { PrismaService } from '../prisma/prisma.service';
  import { CreateReservationDto } from './dto/create-reservation.dto';
  
  @Injectable()
  export class ReservationsService {
    constructor(
      private readonly prisma: PrismaService,
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
                in: ['PENDING', 'CONFIRMED'],
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
      
            status: 'PENDING',
      
            expiresAt,
          },
        });
      }
      async findAll(userId: number) {
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
  }