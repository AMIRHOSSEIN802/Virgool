import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ImageEntity } from './entities/image.entity';
import { Repository } from 'typeorm';
import { MulterFile } from 'src/common/utils/multer.utils';
import { ImageDto } from './dto/create-image.dto';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(ImageEntity)
    private imageRepository: Repository<ImageEntity>,
  ) {}
  create(ImageDto: ImageDto, image: MulterFile) {
    return image;
  }

  findAll() {
    return `This action returns all image`;
  }

  findOne(id: number) {
    return `This action returns a #${id} image`;
  }

  remove(id: number) {
    return `This action removes a #${id} image`;
  }
}
