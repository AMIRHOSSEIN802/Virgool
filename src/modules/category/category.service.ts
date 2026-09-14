import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryEntity } from './entities/category.entity';
import { BlogCategoryEntity } from 'src/modules/blog/entities/blog-category.entity';
import { Repository } from 'typeorm';
import {
  ConflictMessage,
  NotFoundMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {
  paginationGenerator,
  paginationSolver,
} from 'src/common/utils/pagination.util';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepository: Repository<CategoryEntity>,
  ) {}
  async create(createCategoryDto: CreateCategoryDto) {
    const { title: categoryTitle, priority } = createCategoryDto;
    const title = await this.checkExistAndResolveTitle(categoryTitle);
    const category = this.categoryRepository.create({
      title,
      priority,
    });
    await this.categoryRepository.save(category);
    return {
      message: PublicMessage.Created,
    };
  }
  async insertByTitle(title: string) {
    const category = this.categoryRepository.create({
      title,
    });
    return this.categoryRepository.save(category);
  }

  async checkExistAndResolveTitle(title: string) {
    title = title?.trim()?.toLowerCase();
    const category = await this.categoryRepository.findOneBy({ title });
    if (category) throw new ConflictException(ConflictMessage.CategoryTitle);
    return title;
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    const [categories, count] = await this.categoryRepository.findAndCount({
      where: {},
      skip,
      take: limit,
      order: { id: 'ASC' },
    });
    // Real per-category blog usage (admin list shows it; public consumers
    // ignore the extra field). One grouped query — no N+1, nothing invented.
    let usage = new Map<number, number>();
    if (categories.length > 0) {
      const rows: { categoryId: number; n: string }[] = await this.categoryRepository.manager
        .getRepository(BlogCategoryEntity)
        .createQueryBuilder('bc')
        .select('bc.categoryId', 'categoryId')
        .addSelect('COUNT(*)', 'n')
        .where('bc.categoryId IN (:...ids)', { ids: categories.map((c) => c.id) })
        .groupBy('bc.categoryId')
        .getRawMany();
      usage = new Map(rows.map((r) => [Number(r.categoryId), Number(r.n)]));
    }
    return {
      pagination: paginationGenerator(count, page, limit),
      categories: categories.map((c) => ({ ...c, blogCount: usage.get(c.id) ?? 0 })),
    };
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category)
      throw new NotFoundException(NotFoundMessage.NotFoundCategory);
    return category;
  }
  async findOneByTitle(title: string) {
    return await this.categoryRepository.findOneBy({ title });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    const { priority, title } = updateCategoryDto;
    if (title) {
      // Normalized like create; the duplicate check must ignore the row's own
      // id (renaming "abc" → "ABC" resolves to the same title and is a no-op).
      const resolved = title.trim().toLowerCase();
      const clash = await this.categoryRepository.findOneBy({ title: resolved });
      if (clash && clash.id !== id) {
        throw new ConflictException(ConflictMessage.CategoryTitle);
      }
      category.title = resolved;
    }
    if (priority !== undefined && priority !== null) category.priority = priority;
    await this.categoryRepository.save(category);
    return {
      message: PublicMessage.Updated,
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.categoryRepository.delete({ id });
    return {
      message: PublicMessage.Deleted,
    };
  }
}
