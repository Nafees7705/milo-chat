import { Schema, model, models, type InferSchemaType } from "mongoose";

const MessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const ConversationSchema = new Schema(
  {
    owner: { type: String, required: true, index: true },
    title: { type: String, default: "New conversation" },
    memory: { type: String, default: "" },
    summary: { type: String, default: "" },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

export type Message = InferSchemaType<typeof MessageSchema>;
export type Conversation = InferSchemaType<typeof ConversationSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const ConversationModel =
  models.Conversation ?? model("Conversation", ConversationSchema);
