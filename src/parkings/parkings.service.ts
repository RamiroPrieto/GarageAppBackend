import { Injectable , NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from 'src/parkings/dto/update-parking.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ParkingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: number,
    createParkingDto: CreateParkingDto,
  ) {
    return this.prisma.parking.create({
      data: {
        ownerId,

        title: createParkingDto.title,
        description: createParkingDto.description,

        address: createParkingDto.address,
        city: createParkingDto.city,
        country: createParkingDto.country,

        latitude: createParkingDto.latitude,
        longitude: createParkingDto.longitude,

        pricePerHour: createParkingDto.pricePerHour,
        pricePerDay: createParkingDto.pricePerDay,

        maxHeight: createParkingDto.maxHeight,
        maxWidth: createParkingDto.maxWidth,

        covered: createParkingDto.covered,

        parkingType: createParkingDto.parkingType,

        // Los dejamos controlados por backend
        parkingStatus: 'UNAVAILABLE',
        active: true,
      },
    });
  }
  async findAll() {
    return this.prisma.parking.findMany({
      where: {
        active: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async findOne(id: number) {
    const parking = await this.prisma.parking.findUnique({
      where: {
        id,
      },
      include: {
        photos: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });
  
    if (!parking) {
      throw new NotFoundException('Parking no encontrado');
    }
  
    return parking;
  }
  async update(
    ownerId: number,
    parkingId: number,
    updateParkingDto: UpdateParkingDto,
  ) {
    const parking = await this.prisma.parking.findFirst({
      where: {
        id: parkingId,
        ownerId,
      },
    });
  
    if (!parking) {
      throw new NotFoundException('Parking no encontrado');
    }
  
    return this.prisma.parking.update({
      where: {
        id: parkingId,
      },
      data: updateParkingDto,
    });
  }
  async remove(ownerId: number, parkingId: number) {
    const parking = await this.prisma.parking.findFirst({
      where: {
        id: parkingId,
        ownerId,
      },
    });
  
    if (!parking) {
      throw new NotFoundException('Parking no encontrado');
    }
  
    await this.prisma.parking.delete({
      where: {
        id: parkingId,
      },
    });
  
    return {
      message: 'Parking eliminado correctamente',
    };
  }
  async findNearby(
    latitude: number,
    longitude: number,
    radius: number,
  ) {
    return this.prisma.$queryRaw<
      Array<{
        id: number;
        ownerId: number;
        title: string;
        description: string | null;
        address: string;
        city: string;
        country: string;
        latitude: number;
        longitude: number;
        pricePerHour: number;
        pricePerDay: number | null;
        maxHeight: number | null;
        maxWidth: number | null;
        covered: boolean;
        parkingType: string;
        parkingStatus: string;
        active: boolean;
        availableSince: Date | null;
        createdAt: Date;
        updatedAt: Date;
        distance: number;
      }>
    >(Prisma.sql`
      SELECT *
      FROM (
        SELECT
          p.*,
          (
            6371 * acos(
              LEAST(
                1,
                GREATEST(
                  -1,
                  cos(radians(${latitude}))
                  * cos(radians(CAST(p."latitude" AS double precision)))
                  * cos(
                      radians(CAST(p."longitude" AS double precision))
                      - radians(${longitude})
                    )
                  + sin(radians(${latitude}))
                  * sin(radians(CAST(p."latitude" AS double precision)))
                )
              )
            )
          ) AS distance
        FROM "Parking" p
        WHERE p.active = true
      ) AS nearby
      WHERE nearby.distance <= ${radius}
      ORDER BY nearby.distance ASC;
    `);
  }
}