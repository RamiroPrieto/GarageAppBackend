import { Injectable,
    NotFoundException,
 } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from 'src/vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from 'src/vehicles/dto/update-vehicle.dto';
@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, createVehicleDto: CreateVehicleDto) {
    const vehicleCount = await this.prisma.vehicle.count({ where: { userId } });

    return this.prisma.vehicle.create({
      data: {
        userId,
        licensePlate: createVehicleDto.licensePlate,
        brand: createVehicleDto.brand,
        model: createVehicleDto.model,
        color: createVehicleDto.color,
        isDefault: vehicleCount === 0,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.vehicle.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }


  async findOne(userId: number, vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId,
      },
    });
  
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    return vehicle;
  }

  async update(
    userId: number,
    vehicleId: number,
    updateVehicleDto: UpdateVehicleDto,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId,
      },
    });
  
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    return this.prisma.vehicle.update({
      where: {
        id: vehicleId,
      },
      data: updateVehicleDto,
    });
  }
  
  async remove(userId: number, vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId,
      },
    });
  
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    await this.prisma.vehicle.delete({
      where: {
        id: vehicleId,
      },
    });
  
    return {
      message: 'Vehículo eliminado correctamente',
    };
  }
  async setDefault(userId: number, vehicleId: number, isDefault: boolean) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId,
      },
    });
  
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    if (!isDefault) {
      return this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isDefault: false },
      });
    }

    const [, updatedVehicle] = await this.prisma.$transaction([
      this.prisma.vehicle.updateMany({
        where: {
          userId,
        },
        data: {
          isDefault: false,
        },
      }),
  
      this.prisma.vehicle.update({
        where: {
          id: vehicleId,
        },
        data: {
          isDefault: true,
        },
      }),
    ]);
  
    return updatedVehicle;
  }
}
