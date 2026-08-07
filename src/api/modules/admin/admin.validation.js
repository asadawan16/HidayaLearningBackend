const { z } = require('zod');

const translation = z.object({
  lang: z.string(),
  source: z.string().optional(),
  text: z.string(),
});

const ayah = {
  params: z.object({
    surah: z.coerce.number().int().min(1).max(114),
    number: z.coerce.number().int().min(1),
  }),
  body: z.object({
    textUthmani: z.string().optional(),
    textIndopak: z.string().optional(),
    sajda: z.boolean().optional(),
    translations: z.array(translation).optional(),
    audioUrl: z.string().url().optional(),
  }),
};

const word = {
  params: z.object({
    surah: z.coerce.number().int().min(1).max(114),
    ayah: z.coerce.number().int().min(1),
    position: z.coerce.number().int().min(1),
  }),
  body: z.object({
    textUthmani: z.string().optional(),
    textIndopak: z.string().optional(),
    translation: z.string().optional(),
    transliteration: z.string().optional(),
    override: z.object({ translit: z.string().optional(), tajweedRole: z.string().optional() }).optional(),
    audioUrl: z.string().url().optional(),
  }),
};

const cell = z.object({ order: z.number().optional(), text: z.string(), overrides: z.any().optional() });
const qaidaLesson = {
  params: z.object({ slug: z.string() }),
  body: z.object({
    title: z.object({ en: z.string().optional(), ur: z.string().optional(), tr: z.string().optional() }).optional(),
    subtitle: z.string().optional(),
    hint: z.string().optional(),
    complete: z.boolean().optional(),
    order: z.number().int().optional(),
    sourcePages: z.array(z.number().int()).optional(),
    pages: z
      .array(
        z.object({
          order: z.number().int().optional(),
          heading: z.string().nullable().optional(),
          columns: z.number().int().min(1).max(12).optional(),
          cells: z.array(cell),
        }),
      )
      .optional(),
  }),
};

const duaBody = z.object({
  category: z.string().optional(),
  order: z.number().int().optional(),
  title: z.object({ en: z.string().optional(), ur: z.string().optional(), ar: z.string().optional() }).optional(),
  arabic: z.string().optional(),
  transliteration: z.string().optional(),
  translation: z.object({ en: z.string().optional(), ur: z.string().optional() }).optional(),
  reference: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

const duaCreate = { body: duaBody.extend({ arabic: z.string().min(1) }) };
const duaUpdate = { params: z.object({ id: z.string() }), body: duaBody };
const duaDelete = { params: z.object({ id: z.string() }) };

module.exports = { ayah, word, qaidaLesson, duaCreate, duaUpdate, duaDelete };
