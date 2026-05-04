import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class RefreshToken extends Document {
  @Prop({ required: true })
  user_id: string;

  @Prop({ unique: true, required: true })
  token_hash: string;

  @Prop({ type: Date, required: true })
  expires_at: Date;

  @Prop({ default: false })
  is_revoked: boolean;

  @Prop({ type: Date })
  created_at: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
