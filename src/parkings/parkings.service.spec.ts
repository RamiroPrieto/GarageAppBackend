import { Test, TestingModule } from '@nestjs/testing';
import { ParkingsService } from './parkings.service';

describe('ParkingsService', () => {
  let service: ParkingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingsService],
    }).compile();

    service = module.get<ParkingsService>(ParkingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
