import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAME_DIR = path.join(__dirname, 'game');
const SCENE_DIR = path.join(GAME_DIR, 'scene');
const BG_DIR = path.join(GAME_DIR, 'background');
const FIGURE_DIR = path.join(GAME_DIR, 'figure');
const BGM_DIR = path.join(GAME_DIR, 'bgm');
const ANIMATION_TABLE = JSON.parse(
  fs.readFileSync(path.join(GAME_DIR, 'animation', 'animationTable.json'), 'utf-8'),
);

function listSceneFiles(dir, prefix = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...listSceneFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.txt')) {
      results.push(rel);
    }
  }
  return results.sort();
}

const KNOWN_COMMANDS = new Set([
  'intro',
  'bgm',
  'getUserInput',
  'setVar',
  'unlockBgm',
  'unlockCg',
  'changeBg',
  'changeFigure',
  'pixiPerform',
  'pixiInit',
  'choose',
  'label',
  'jumpLabel',
  'changeScene',
  'setAnimation',
  'end',
]);

function stripParams(raw) {
  return raw.replace(/\s+-[a-zA-Z0-9_]+(?:=[^\s;]+|:[^\s;]+)?/g, '').trim();
}

test('all 32 WebGAL scene files have valid syntax, labels, assets, animations, and variables', () => {
  const sceneFiles = listSceneFiles(SCENE_DIR);
  assert.equal(sceneFiles.length, 32, `Expected 32 scene files, found ${sceneFiles.length}`);

  const bgFiles = new Set(fs.readdirSync(BG_DIR));
  const figureFiles = new Set(fs.readdirSync(FIGURE_DIR));
  const bgmFiles = new Set(fs.readdirSync(BGM_DIR));
  const animSet = new Set(ANIMATION_TABLE);
  const sceneSet = new Set(sceneFiles);

  const initializedVars = new Set();
  const usedWhenVars = new Set();
  const edges = new Map();

  for (const rel of sceneFiles) {
    const content = fs.readFileSync(path.join(SCENE_DIR, rel), 'utf-8');
    const lines = content.split(/\r?\n/);

    const labels = new Set();
    const labelRefs = [];
    const outgoing = new Set();

    // First pass: collect labels
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('label:')) {
        const name = line.slice('label:'.length).replace(/;$/, '').trim();
        labels.add(name);
      }
    }

    // Second pass: validate commands and dialogue
    lines.forEach((rawLine, idx) => {
      const lineNo = idx + 1;
      const line = rawLine.trim();
      if (!line || line.startsWith(';')) return;

      const colonIdx = line.indexOf(':');
      if (line === 'pixiInit;' || line === 'end;') {
        return;
      }

      assert.ok(colonIdx > 0, `${rel}:${lineNo} missing ':' separator -> ${line}`);
      const head = line.slice(0, colonIdx).trim();
      const body = line.slice(colonIdx + 1).trim();

      if (KNOWN_COMMANDS.has(head)) {
        assert.ok(
          line.endsWith(';'),
          `${rel}:${lineNo} command '${head}' must end with ';' -> ${line}`,
        );
        const bodyNoSemi = body.slice(0, -1).trim();

        // Check -when= variables
        for (const match of bodyNoSemi.matchAll(/-when=([A-Za-z_][A-Za-z0-9_]*)/g)) {
          usedWhenVars.add(match[1]);
        }

        // Check -enter= / -exit= (ms fade duration for bgm, animation name otherwise)
        for (const match of bodyNoSemi.matchAll(/-(?:enter|exit)=([^\s;]+)/g)) {
          if (head === 'bgm') {
            assert.match(
              match[1],
              /^\d+$/,
              `${rel}:${lineNo} bgm fade duration '${match[1]}' must be integer ms`,
            );
          } else {
            assert.ok(
              animSet.has(match[1]),
              `${rel}:${lineNo} unknown animation '${match[1]}'`,
            );
          }
        }

        if (head === 'setVar') {
          const varName = bodyNoSemi.split('=')[0].trim();
          if (rel === 'start.txt') {
            initializedVars.add(varName);
          }
        } else if (head === 'changeBg' || head === 'unlockCg') {
          if (head === 'unlockCg') {
            assert.ok(
              !bodyNoSemi.includes('-name:'),
              `${rel}:${lineNo} unlockCg must use '-name=' instead of '-name:' -> ${line}`,
            );
          }
          const file = stripParams(bodyNoSemi);
          if (file !== 'none') {
            assert.ok(bgFiles.has(file), `${rel}:${lineNo} missing background '${file}'`);
          }
        } else if (head === 'changeFigure') {
          const file = stripParams(bodyNoSemi);
          if (file !== 'none') {
            assert.ok(figureFiles.has(file), `${rel}:${lineNo} missing figure '${file}'`);
          }
        } else if (head === 'bgm' || head === 'unlockBgm') {
          if (head === 'unlockBgm') {
            assert.ok(
              !bodyNoSemi.includes('-name:'),
              `${rel}:${lineNo} unlockBgm must use '-name=' instead of '-name:' -> ${line}`,
            );
          }
          const file = stripParams(bodyNoSemi);
          if (file !== 'none') {
            assert.ok(bgmFiles.has(file), `${rel}:${lineNo} missing bgm '${file}'`);
          }
        } else if (head === 'setAnimation') {
          const anim = stripParams(bodyNoSemi);
          assert.ok(animSet.has(anim), `${rel}:${lineNo} missing animation '${anim}'`);
        } else if (head === 'jumpLabel') {
          const target = stripParams(bodyNoSemi);
          labelRefs.push({ target, lineNo });
        } else if (head === 'choose') {
          const options = bodyNoSemi.split('|');
          assert.ok(options.length >= 2, `${rel}:${lineNo} choose needs at least 2 options`);
          for (const opt of options) {
            const parts = opt.split(':');
            assert.equal(parts.length, 2, `${rel}:${lineNo} invalid choose option '${opt}'`);
            labelRefs.push({ target: parts[1].trim(), lineNo });
          }
        } else if (head === 'changeScene') {
          const target = stripParams(bodyNoSemi);
          assert.ok(sceneSet.has(target), `${rel}:${lineNo} missing target scene '${target}'`);
          outgoing.add(target);
        }
      } else {
        // Dialogue line
        const whenMatch = body.match(/\s+-when=([A-Za-z_][A-Za-z0-9_]*)[<>=!0-9]+;$/);
        if (whenMatch) {
          usedWhenVars.add(whenMatch[1]);
        } else {
          assert.ok(
            !body.includes(';'),
            `${rel}:${lineNo} dialogue contains stray ASCII ';' -> ${line}`,
          );
        }
      }
    });

    for (const ref of labelRefs) {
      assert.ok(
        labels.has(ref.target),
        `${rel}:${ref.lineNo} jumps to missing label '${ref.target}'`,
      );
    }

    edges.set(rel, outgoing);
  }

  // Verify every -when variable is initialized in start.txt
  for (const v of usedWhenVars) {
    assert.ok(
      initializedVars.has(v),
      `Variable '${v}' used in -when= was not initialized in start.txt`,
    );
  }

  // Verify all 32 scenes are reachable from start.txt
  const visited = new Set();
  const queue = ['start.txt'];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const next of edges.get(cur) || []) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  const unreachable = sceneFiles.filter((f) => !visited.has(f));
  assert.deepEqual(unreachable, [], `Unreachable scene files: ${unreachable.join(', ')}`);
});

test('both routes have rich content and end cleanly with end; and CG unlocks', () => {
  const ivanEnd = fs.readFileSync(path.join(SCENE_DIR, 'i/终章.txt'), 'utf-8');
  const wanEnd = fs.readFileSync(path.join(SCENE_DIR, 'w/终章.txt'), 'utf-8');
  assert.ok(ivanEnd.includes('unlockCg:请和我交往吧.png'));
  assert.ok(ivanEnd.includes('end;'));
  assert.ok(wanEnd.includes('unlockCg:请和我交往吧.png'));
  assert.ok(wanEnd.includes('end;'));

  const ch5 = fs.readFileSync(path.join(SCENE_DIR, '第五章.txt'), 'utf-8');
  assert.ok(ch5.includes('changeBg:MusicRoom.jpg;'), 'Chapter 5 should fulfill the 7:30 AM music room promise');

  const ch11 = fs.readFileSync(path.join(SCENE_DIR, '第十一章.txt'), 'utf-8');
  assert.ok(!ch11.includes('成绩单上的数字'), 'Chapter 11 should not mention grades before Tuesday release');
});

test('complete 7-track soundtrack exists, is valid MP3 audio, is unlocked in start.txt, and is scored across scenes', () => {
  const expectedTracks = [
    's_Title.mp3',
    '樱花与晨光.mp3',
    '午后书页.mp3',
    '窗边有人在听.mp3',
    '考场钟声.mp3',
    '雨声与心事.mp3',
    '星海告白.mp3',
  ];

  const startText = fs.readFileSync(path.join(SCENE_DIR, 'start.txt'), 'utf-8');
  const allSceneText = listSceneFiles(SCENE_DIR)
    .map((rel) => fs.readFileSync(path.join(SCENE_DIR, rel), 'utf-8'))
    .join('\n');

  const configText = fs.readFileSync(path.join(GAME_DIR, 'config.txt'), 'utf-8');
  assert.ok(
    configText.includes('Enable_Appreciation:true;'),
    'game/config.txt must enable Appreciation Gallery (Enable_Appreciation:true;)',
  );

  for (const track of expectedTracks) {
    const fullPath = path.join(BGM_DIR, track);
    assert.ok(fs.existsSync(fullPath), `Missing BGM file: ${track}`);

    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 100_000, `BGM file ${track} too small (${stat.size} bytes)`);

    const header = fs.readFileSync(fullPath).subarray(0, 3);
    const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
    const isMpegSync = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
    assert.ok(isId3 || isMpegSync, `BGM file ${track} does not have a valid MP3/ID3 header`);

    assert.ok(
      startText.includes(`unlockBgm:${track}`),
      `BGM ${track} must be registered via unlockBgm in start.txt`,
    );
    assert.ok(
      allSceneText.includes(`bgm:${track}`),
      `BGM ${track} must be played in at least one scene`,
    );
  }
});

