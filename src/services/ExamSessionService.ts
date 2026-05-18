import { Repository } from 'typeorm';
import { ExamSession } from '../entities/ExamSession';
import { AppDataSource } from '../data-source';

export class ExamSessionService {
  private examSessionRepository: Repository<ExamSession>;

  constructor() {
    this.examSessionRepository = AppDataSource.getRepository(ExamSession);
  }

  async findAll() {
    return this.examSessionRepository.find({ relations: ['positions'] });
  }

  findById(id: number) {
    return this.examSessionRepository.findOne({
      where: { id },
      relations: ['positions']
    });
  }

  create(data: Partial<ExamSession>) {
    const examSession = this.examSessionRepository.create(data);
    return this.examSessionRepository.save(examSession);
  }

  async update(id: number, data: Partial<ExamSession>) {
    await this.examSessionRepository.update(id, data);
    return this.findById(id);
  }

  delete(id: number) {
    return this.examSessionRepository.delete(id);
  }
}
