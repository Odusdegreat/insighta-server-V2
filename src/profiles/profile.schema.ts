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

// Indexes for query performance (common filter combinations)
ProfileSchema.index({ gender: 1, age: 1 });
ProfileSchema.index({ country_id: 1, age: 1 });
ProfileSchema.index({ age_group: 1, gender: 1 });
ProfileSchema.index({ gender: 1, country_id: 1 });
ProfileSchema.index({ age: 1 });
ProfileSchema.index({ name: 1 }, { unique: true }); // For idempotency check

