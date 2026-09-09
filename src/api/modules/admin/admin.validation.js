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
const qaidaBody = z.object({
  // The slug is the lesson's public URL (/lesson/:slug). Editable, because an
  // admin who typos it while creating a chapter would otherwise have to delete
  // the chapter to fix it — but the unique index still rejects a clash.
  slug: z.string().min(1).optional(),
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
});

const qaidaLesson = { params: z.object({ slug: z.string() }), body: qaidaBody };
// A chapter needs a slug and nothing else: it is created empty and filled in.
// `order` is optional and defaults to the end of the book (see the service).
const qaidaLessonCreate = { body: qaidaBody.extend({ slug: z.string().min(1) }) };
const qaidaLessonDelete = { params: z.object({ slug: z.string() }) };

const duaBody = z.object({
  category: z.string().optional(),
  order: z.number().int().optional(),
  title: z.object({ en: z.string().optional(), ur: z.string().optional(), ar: z.string().optional() }).optional(),
  arabic: z.string().optional(),
  transliteration: z.string().optional(),
  translation: z.object({ en: z.string().optional(), ur: z.string().optional() }).optional(),
  featured: z.boolean().optional(),
  reference: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

// A du'ā has to say SOMETHING. `arabic` used to be the required field, which
// ruled out the ones that only exist in Urdu and English — so the requirement is
// now the pair: Arabic, or a translation, or both.
const duaCreate = {
  body: duaBody.refine(
    (d) => Boolean(d.arabic?.trim() || d.translation?.en?.trim() || d.translation?.ur?.trim()),
    { message: 'A du’ā needs either Arabic or a translation', path: ['arabic'] },
  ),
};
const duaUpdate = { params: z.object({ id: z.string() }), body: duaBody };
const duaDelete = { params: z.object({ id: z.string() }) };

const byId = z.object({ id: z.string() });

const kalimaBody = z.object({
  order: z.number().int().optional(),
  slug: z.string().min(1).optional(),
  name: z.object({ en: z.string().optional(), ur: z.string().optional(), ar: z.string().optional() }).optional(),
  arabic: z.string().optional(),
  transliteration: z.string().optional(),
  translation: z.object({ en: z.string().optional(), ur: z.string().optional() }).optional(),
  virtue: z.string().optional(),
  reference: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

// slug + arabic are the two a Kalima cannot exist without: the slug is its
// stable public URL and the Arabic is the content itself.
const kalimaCreate = { body: kalimaBody.extend({ slug: z.string().min(1), arabic: z.string().min(1) }) };
const kalimaUpdate = { params: byId, body: kalimaBody };
const kalimaDelete = { params: byId };

// Kept open rather than an enum: an admin adding a school-specific step (or a
// new illustration) must not need a backend deploy. The frontend falls back to
// a neutral figure for a pose it doesn't recognise.
const POSE = z.string().min(1);

const namazBody = z.object({
  order: z.number().int().optional(),
  slug: z.string().min(1).optional(),
  name: z.object({ en: z.string().optional(), ur: z.string().optional(), ar: z.string().optional() }).optional(),
  pose: POSE.optional(),
  arabic: z.string().optional(),
  transliteration: z.string().optional(),
  translation: z.object({ en: z.string().optional(), ur: z.string().optional() }).optional(),
  note: z.string().optional(),
  repetitions: z.number().int().min(1).max(99).optional(),
  optional: z.boolean().optional(),
});

const namazCreate = { body: namazBody.extend({ slug: z.string().min(1), pose: POSE }) };
const namazUpdate = { params: byId, body: namazBody };
const namazDelete = { params: byId };

module.exports = {
  ayah,
  word,
  qaidaLesson,
  qaidaLessonCreate,
  qaidaLessonDelete,
  duaCreate,
  duaUpdate,
  duaDelete,
  kalimaCreate,
  kalimaUpdate,
  kalimaDelete,
  namazCreate,
  namazUpdate,
  namazDelete,
};
