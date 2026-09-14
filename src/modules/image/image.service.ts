import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ImageEntity } from './entities/image.entity';
import { Repository } from 'typeorm';
import { MulterFile } from 'src/common/utils/multer.utils';
import { ImageDto } from './dto/create-image.dto';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { NotFoundMessage, PublicMessage } from 'src/common/enums/message.enum';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(ImageEntity)
    private imageRepository: Repository<ImageEntity>,
    @Inject(REQUEST) private req: Request,
  ) {}
  async create(imageDto: ImageDto, image: MulterFile) {
    const userId = this.req.user.id;
    const { alt, name } = imageDto;
    const location = image?.path?.slice(7);
    const result = await this.imageRepository.insert({
      alt: alt || name,
      name,
      location,
      userId,
    });
    // Return the stored identity so clients (editor image insert) can build a
    // URL immediately without guessing — insert() does not echo the entity.
    return {
      message: PublicMessage.Created,
      image: { id: Number(result.identifiers?.[0]?.id ?? 0), location },
    };
  }

  findAll() {
    const userId = this.req.user.id;
    return this.imageRepository.find({
      where: { userId },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const userId = this.req.user.id;
    const image = await this.imageRepository.findOne({
      where: { userId, id },
      order: { id: 'DESC' },
    });
    if (!image) throw new NotFoundException(NotFoundMessage.NotFound);
    return image;
  }

  async remove(id: number) {
    const image = await this.findOne(id);
    await this.imageRepository.remove(image);
    return {
      message: PublicMessage.Deleted,
    };
  }
}
