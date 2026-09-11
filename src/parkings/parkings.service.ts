import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from 'src/parkings/dto/update-parking.dto';
import { Prisma } from '@prisma/client';
import { UpdateParkingActiveDto } from './dto/update-parking-active.dto';
import { ReservationStatus } from '@prisma/client';
import { GeocodeParkingAddressDto } from './dto/geocode-parking-address.dto';
@Injectable()
export class ParkingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async geocodeAddress({
    address,
    city,
    country,
  }: GeocodeParkingAddressDto): Promise<{ latitude: number; longitude: number }> {
    const apiKey = this.configService.get<string>(
      'GOOGLE_MAPS_GEOCODING_API_KEY',
    );

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'El servicio de ubicación no está configurado',
      );
    }

    const query = [address, city, country].join(', ');
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', query);
    url.searchParams.set('key', apiKey);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new ServiceUnavailableException(
        'No pudimos consultar el servicio de ubicación',
      );
    }

    let payload: {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException('El servicio de ubicación respondió inválidamente');
    }

    if (!response.ok || payload.status !== 'OK') {
      if (payload.status === 'ZERO_RESULTS') {
        throw new NotFoundException(
          'No pudimos encontrar esa dirección. Revisá la dirección, ciudad y país.',
        );
      }

      throw new ServiceUnavailableException(
        'No pudimos consultar el servicio de ubicación',
      );
    }

    const location = payload.results?.[0]?.geometry?.location;
    const latitude = location?.lat;
    const longitude = location?.lng;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new NotFoundException(
        'No pudimos encontrar esa dirección. Revisá la dirección, ciudad y país.',
      );
    }

    return { latitude, longitude };
  }

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
        parkingStatus: 'AVAILABLE',
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
  async updateActive(
    ownerId: number,
    parkingId: number,
    updateParkingActiveDto: UpdateParkingActiveDto,
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
      data: {
        active: updateParkingActiveDto.active,
      },
    });
  }
  async findAvailable(
    startDatetime: Date,
    endDatetime: Date,
  ) {
    return this.prisma.parking.findMany({
      where: {
        active: true,
  
        reservations: {
          none: {
            AND: [
              {
                status: {
                  in: [
                    ReservationStatus.PENDING,
                    ReservationStatus.CONFIRMED,
                  ],
                },
              },
              {
                startDatetime: {
                  lt: endDatetime,
                },
              },
              {
                endDatetime: {
                  gt: startDatetime,
                },
              },
            ],
          },
        },
      },
    });
  }
}
