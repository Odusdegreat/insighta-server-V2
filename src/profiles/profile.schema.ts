import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Profile extends Document {
  @Prop({ type: String, required: true })
  declare id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  gender: string;

  @Prop({ type: Number, required: true })
  gender_probability: number;

  @Prop({ type: Number, required: true })
  age: number;

  @Prop({ required: true })
  age_group: string;

  @Prop({ length: 2, required: true })
  country_id: string;

  @Prop({ required: true })
  country_name: string;

  @Prop({ type: Number, required: true })
  country_probability: number;

  @Prop({ type: Date })
  created_at: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
