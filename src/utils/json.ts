import { z } from 'zod';

export const jsonValueSchema = z.json();
export const jsonObjectSchema = z.object({}).catchall(jsonValueSchema);

const timelineElementSchema = jsonObjectSchema;
const timelineFileSchema = jsonObjectSchema.extend({
  id: z.string().optional(),
  uid: z.string().optional(),
  title: z.string().optional(),
  neverSync: z.boolean().optional(),
  groups: z.array(jsonObjectSchema).optional(),
});

// Timeline documents are intentionally permissive so newer versions can add
// fields without older clients discarding them, while still requiring the
// structural fields that identify a timeline.
export const timelineSchema = jsonObjectSchema.extend({
  file: timelineFileSchema.optional(),
  elements: z.array(timelineElementSchema),
});

export const appSettingsSchema = jsonObjectSchema.extend({
  timelineStorageDir: z.string().optional(),
  storageDir: z.string().optional(),
  notesStorageDir: z.string().optional(),
  themeKey: z.string().optional(),
  theme: z.string().optional(),
  notesSubfolder: z.string().optional(),
  notesSubfolderEnabled: z.boolean().optional(),
  appFontFamily: z.string().optional(),
  appFontSize: z.number().finite().optional(),
  keybinds: z.record(z.string(), z.string()).optional(),
  hardwareAcceleration: z.boolean().optional(),
  startMaximized: z.boolean().optional(),
  assetsStorageDir: z.string().optional(),
  homeSortMode: z.string().optional(),
  homeViewMode: z.string().optional(),
  homeSidebarWidth: z.number().finite().optional(),
  gitSyncAutoSync: z.boolean().optional(),
  gitSyncIntervalMinutes: z.number().finite().optional(),
  gitSyncMachineLabel: z.string().optional(),
});

export const timelinePackageManifestSchema = z
  .object({ format: z.literal('timeline-package'), version: z.number().int().positive() })
  .passthrough();

export const gitSyncCredentialsEnvelopeSchema = z.object({ data: z.string(), encrypted: z.boolean() });
export const gitSyncCredentialsSchema = z.object({ token: z.string(), username: z.string().optional() }).passthrough();
export const gitSyncStateSchema = z
  .object({
    url: z.string().url(),
    branch: z.string().min(1),
    machineLabel: z.string().optional(),
    uidToPath: z.record(z.string(), z.string()),
    excludedPaths: z.array(z.string()).optional(),
    writeReadme: z.boolean().optional(),
    lastSyncedCommit: z.string().optional(),
  })
  .passthrough();

export const themeSchema = jsonObjectSchema;
export const panelPreferencesSchema = z.record(z.string(), jsonObjectSchema);
export const filterHistorySchema = z.array(z.string());
export const sourcesSchema = z.array(jsonObjectSchema);
export const mediaWikiResponseSchema = z
  .object({
    parse: z
      .object({
        sections: z
          .array(
            z.object({ anchor: z.string(), line: z.string(), index: z.union([z.string(), z.number()]) }).passthrough(),
          )
          .optional(),
        text: z.union([z.string(), z.object({ '*': z.string().optional() }).passthrough()]).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * Decodes JSON and verifies that the result contains only JSON-compatible data.
 * Callers that require a narrower shape can validate the returned value further.
 */
export function parseJson<T>(source: string, schema: z.ZodType<T>): T {
  const parsed: unknown = JSON.parse(source);
  return schema.parse(parsed);
}

export const parseTimelineJson = (source: string) => parseJson(source, timelineSchema);
export const parseAppSettingsJson = (source: string) => parseJson(source, appSettingsSchema);
export const parseTimelinePackageManifestJson = (source: string) => parseJson(source, timelinePackageManifestSchema);
export const parseGitSyncCredentialsEnvelopeJson = (source: string) =>
  parseJson(source, gitSyncCredentialsEnvelopeSchema);
export const parseGitSyncCredentialsJson = (source: string) => parseJson(source, gitSyncCredentialsSchema);
export const parseGitSyncStateJson = (source: string) => parseJson(source, gitSyncStateSchema);
export const parseThemeJson = (source: string) => parseJson(source, themeSchema);
export const parsePanelPreferencesJson = (source: string) => parseJson(source, panelPreferencesSchema);
export const parseFilterHistoryJson = (source: string) => parseJson(source, filterHistorySchema);
export const parseSourcesJson = (source: string) => parseJson(source, sourcesSchema);
export const parseMediaWikiResponseJson = (source: string) => parseJson(source, mediaWikiResponseSchema);
