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
import { PlaceAutocompleteDto } from './dto/place-autocomplete.dto';
import { ReservationsService } from '../reservations/reservations.service';
@Injectable()
export class ParkingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly reservationsService: ReservationsService,
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

  async autocompletePlaces({
    input,
    latitude,
    longitude,
    languageCode,
  }: PlaceAutocompleteDto): Promise<Array<{ placeId: string; description: string }>> {
    const apiKey = this.getGoogleMapsServerKey();
    const hasLocationBias =
      typeof latitude === 'number' &&
      Number.isFinite(latitude) &&
      typeof longitude === 'number' &&
      Number.isFinite(longitude);

    console.log('[places] Autocomplete request', {
      hasLocationBias,
      languageCode: languageCode ?? 'default',
    });

    let response: Response;
    try {
      response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['street_address', 'premise', 'route'],
          ...(languageCode ? { languageCode } : {}),
          ...(hasLocationBias
            ? {
                locationBias: {
                  circle: {
                    center: { latitude, longitude },
                    radius: 50_000,
                  },
                },
              }
            : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      console.warn('[places] Autocomplete network failure');
      throw new ServiceUnavailableException('No pudimos consultar las sugerencias de direcciones');
    }

    if (!response.ok) {
      const failure = await response
        .json()
        .catch(() => null) as { error?: { code?: number; status?: string; message?: string } } | null;
      console.warn('[places] Autocomplete rejected by Google', {
        httpStatus: response.status,
        googleCode: failure?.error?.code ?? null,
        googleStatus: failure?.error?.status ?? null,
        googleReason: failure?.error?.message ?? null,
      });
      throw new ServiceUnavailableException('No pudimos consultar las sugerencias de direcciones');
    }

    const payload = await response.json() as {
      suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }>;
    };
    return (payload.suggestions ?? []).flatMap(({ placePrediction }) => {
      const placeId = placePrediction?.placeId;
      const description = placePrediction?.text?.text;
      return typeof placeId === 'string' && typeof description === 'string' ? [{ placeId, description }] : [];
    });
  }

  async getPlaceDetails(placeId: string): Promise<{ latitude: number; longitude: number; formattedAddress: string }> {
    const apiKey = this.getGoogleMapsServerKey();
    let response: Response;
    try {
      response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location,formattedAddress',
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('No pudimos obtener esa dirección');
    }
    if (!response.ok) throw new NotFoundException('No pudimos obtener esa dirección');
    const payload = await response.json() as { location?: { latitude?: number; longitude?: number }; formattedAddress?: string };
    const latitude = payload.location?.latitude;
    const longitude = payload.location?.longitude;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new NotFoundException('No pudimos obtener esa dirección');
    }
    return { latitude, longitude, formattedAddress: payload.formattedAddress ?? placeId };
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<{ city: string; country: string }> {
    const apiKey = this.getGoogleMapsServerKey();
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('key', apiKey);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new ServiceUnavailableException('No pudimos obtener la ubicación del mapa');
    }

    const payload = await response.json().catch(() => null) as {
      status?: string;
      results?: Array<{
        address_components?: Array<{ long_name?: string; types?: string[] }>;
      }>;
    } | null;

    if (!response.ok || payload?.status !== 'OK') {
      throw new ServiceUnavailableException('No pudimos obtener la ubicación del mapa');
    }

    const components = payload.results?.[0]?.address_components ?? [];
    const findComponent = (...types: string[]) => components.find((component) =>
      component.types?.some((type) => types.includes(type)),
    )?.long_name;
    const city = findComponent('locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1');
    const country = findComponent('country');

    if (!city || !country) {
      throw new NotFoundException('No pudimos identificar la ciudad de esa ubicación');
    }

    return { city, country };
  }

  private getGoogleMapsServerKey() {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_GEOCODING_API_KEY');
    if (!apiKey) {
      console.warn('[places] Google Maps server key is not configured');
      throw new ServiceUnavailableException('El servicio de ubicación no está configurado');
    }
    return apiKey;
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
        currency: createParkingDto.currency ?? 'EUR',

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
  async findMine(ownerId: number) {
    return this.prisma.parking.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }
  async findReservations(ownerId: number, parkingId: number) {
    return this.reservationsService.findForParking(ownerId, parkingId);
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
        currency: string;
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
    latitude: number,
    longitude: number,
    radius: number,
  ) {
    const parkings = await this.prisma.parking.findMany({
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

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(radius) ||
      radius < 0
    ) {
      return parkings;
    }

    return parkings.filter((parking) => {
      const parkingLatitude = Number(parking.latitude);
      const parkingLongitude = Number(parking.longitude);
      if (!Number.isFinite(parkingLatitude) || !Number.isFinite(parkingLongitude)) {
        return false;
      }

      const latitudeDelta = ((parkingLatitude - latitude) * Math.PI) / 180;
      const longitudeDelta = ((parkingLongitude - longitude) * Math.PI) / 180;
      const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos((latitude * Math.PI) / 180) *
          Math.cos((parkingLatitude * Math.PI) / 180) *
          Math.sin(longitudeDelta / 2) ** 2;
      const distance = 2 * 6371 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

      return distance <= radius;
    });
  }
}
