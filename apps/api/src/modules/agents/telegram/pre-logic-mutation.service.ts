import { Injectable, Logger } from '@nestjs/common';

interface LogicFrame {
  id: string;
  canExist: boolean;
  conditions: string[];
  createdAt: Date;
}

@Injectable()
export class PreLogicMutationService {
  private readonly logger = new Logger(PreLogicMutationService.name);

  private frames: LogicFrame[] = [];
  private idCounter = 0;

  createFrame(conditions: string[]): LogicFrame {
    const frame: LogicFrame = {
      id: `frame-${++this.idCounter}`,
      canExist: conditions.length > 0,
      conditions: [...conditions],
      createdAt: new Date(),
    };
    this.frames.push(frame);
    this.logger.debug(`Frame created: ${frame.id} conditions=${conditions.join(',')}`);
    return frame;
  }

  mutateFrame(id: string): LogicFrame {
    const frame = this.frames.find((f) => f.id === id);
    if (!frame) {
      return this.createFrame([`auto-condition-${Date.now()}`]);
    }
    // Mutation: randomly add or remove a condition, flip canExist
    const mutated = Math.random() > 0.5;
    if (mutated) {
      frame.conditions.push(`mutated-${Date.now() % 1000}`);
    } else if (frame.conditions.length > 1) {
      frame.conditions.pop();
    }
    frame.canExist = frame.conditions.length > 0 && Math.random() > 0.2;
    this.logger.debug(`Frame mutated: ${id} canExist=${frame.canExist}`);
    return { ...frame };
  }

  getViableFrames(): LogicFrame[] {
    return this.frames.filter((f) => f.canExist);
  }

  getStats() {
    return {
      totalFrames: this.frames.length,
      viableFrames: this.getViableFrames().length,
      nonViableFrames: this.frames.filter((f) => !f.canExist).length,
    };
  }
}
