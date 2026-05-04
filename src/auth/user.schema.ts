import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class User extends Document {
  @Prop({ type: String, required: true })
  declare id: string;

  @Prop({ unique: true, required: true })
  github_id: string;

  @Prop({ required: true })
  username: string;

  @Prop({ type: String, nullable: true })
  email: string;

  @Prop({ type: String, nullable: true })
  avatar_url: string;

  @Prop({ default: 'analyst' })
  role: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: Date, nullable: true })
  last_login_at: Date;

  @Prop({ type: Date })
  created_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
