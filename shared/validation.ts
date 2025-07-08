import { z } from "zod";

// Template validation schema
export const insertTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  content: z.string().min(1, "Template content is required"),
  category: z.string().default("general"),
  mediaType: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  mediaCaption: z.string().nullable().optional(),
  ctaButtons: z.array(z.any()).default([]),
  tags: z.array(z.string()).default([]),
  language: z.string().default("en"),
});

// Contact validation schema
export const insertContactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  groupId: z.number().nullable().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

// Campaign validation schema
export const insertCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  message: z.string().min(1, "Campaign message is required"),
  templateId: z.number().nullable().optional(),
  whatsappNumberId: z.number().nullable().optional(),
  targetGroups: z.array(z.number()).default([]),
  targetContacts: z.array(z.number()).default([]),
  scheduledAt: z.date().nullable().optional(),
  messageDelayMin: z.number().default(1),
  messageDelayMax: z.number().default(5),
});

// Contact Group validation schema
export const insertContactGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
});

// WhatsApp Number validation schema
export const insertWhatsappNumberSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  displayName: z.string().optional(),
  connectionType: z.string().default("qr"),
  status: z.string().default("connecting"),
}); 