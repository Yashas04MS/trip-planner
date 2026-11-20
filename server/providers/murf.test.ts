import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pickVoiceStyle,
  resolveMurfVoiceFromCatalog,
  type MurfVoiceCatalogItem,
} from './murf';

const SAMPLE_CATALOG: MurfVoiceCatalogItem[] = [
  {
    voiceId: 'en-US-natalie',
    displayName: 'Natalie (F)',
    locale: 'en-US',
    gender: 'Female',
    availableStyles: ['Conversational', 'Narration', 'Promo'],
  },
  {
    voiceId: 'en-UK-theo',
    displayName: 'Theo (M)',
    locale: 'en-UK',
    gender: 'Male',
    availableStyles: ['Narration', 'Calm', 'Promo'],
  },
  {
    voiceId: 'en-US-julia',
    displayName: 'Julia (F)',
    locale: 'en-US',
    gender: 'Female',
    availableStyles: ['Calm', 'Conversational'],
  },
  {
    voiceId: 'en-US-wayne',
    displayName: 'Wayne (M)',
    locale: 'en-US',
    gender: 'Male',
    availableStyles: ['Conversational', 'Narration'],
  },
];

test('resolves all four concierge personas dynamically without needing MURF_VOICE_ID', () => {
  const aria = resolveMurfVoiceFromCatalog('aria', SAMPLE_CATALOG);
  const jasper = resolveMurfVoiceFromCatalog('jasper', SAMPLE_CATALOG);
  const maya = resolveMurfVoiceFromCatalog('maya', SAMPLE_CATALOG);
  const leo = resolveMurfVoiceFromCatalog('leo', SAMPLE_CATALOG);

  assert.equal(aria.voiceId, 'en-US-natalie');
  assert.equal(aria.style, 'Conversational');

  assert.equal(jasper.voiceId, 'en-UK-theo');
  assert.equal(jasper.style, 'Narration');

  assert.equal(maya.voiceId, 'en-US-julia');
  assert.equal(maya.style, 'Calm');

  assert.equal(leo.voiceId, 'en-US-wayne');
  assert.equal(leo.style, 'Conversational');
});

test('falls back cleanly when live catalog is empty or lacks preferred IDs', () => {
  const emptyFallback = resolveMurfVoiceFromCatalog('leo', []);
  assert.equal(emptyFallback.voiceId, 'en-US-wayne');

  const altCatalog: MurfVoiceCatalogItem[] = [
    {
      voiceId: 'en-IN-isha',
      displayName: 'Isha (F)',
      locale: 'en-IN',
      gender: 'Female',
      availableStyles: ['Conversational'],
    },
  ];
  const matched = resolveMurfVoiceFromCatalog('aria', altCatalog);
  assert.equal(matched.voiceId, 'en-IN-isha');
  assert.equal(matched.style, 'Conversational');
});

test('pickVoiceStyle falls back to Conversational or first available style', () => {
  assert.equal(pickVoiceStyle(['Narration', 'Calm'], 'Calm'), 'Calm');
  assert.equal(pickVoiceStyle(['Promo', 'Conversational'], 'Calm'), 'Conversational');
  assert.equal(pickVoiceStyle(['Promo'], 'Calm'), 'Promo');
});
