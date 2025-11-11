import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>,
  ) {}

  async getUserById(userId: string): Promise<User | null> {
    // Validate UUID format before querying
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid UUID format');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences'],
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    // create default preferences
    const preferences = this.preferencesRepository.create({
      user_id: savedUser.id,
      email_notifications: true,
      push_notifications: true,
      language: 'en',
    });
    await this.preferencesRepository.save(preferences);

    return savedUser;
  }

  async updateUser(
    userId: string,
    userData: Partial<User>,
  ): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    Object.assign(user, userData);
    return await this.userRepository.save(user);
  }

  async getAllUsersWithPushTokens(): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.push_token', 'user.created_at'])
      .where('user.push_token IS NOT NULL')
      .getMany();
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      return false;
    }

    // Delete preferences first (due to foreign key constraint)
    await this.preferencesRepository.delete({ user_id: userId });

    // Delete user
    await this.userRepository.delete(userId);

    return true;
  }

  async checkDatabase(): Promise<void> {
    await this.userRepository.query('SELECT 1');
  }
}
