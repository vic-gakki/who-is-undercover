import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('game')
export class GameController {
  constructor() {}

  @Get()
  findAll() {
    return 'hello, test';
  }

}