import { describe, test, expect, beforeAll } from '@jest/globals';

// Mock PIXI globally to prevent import failures from phaser-ce
Object.defineProperty(global, 'PIXI', {
  value: {
    VERSION: '4.0.0',
    Point: class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
    },
    Polygon: class {
      constructor(points: any[]) {
        this.points = points || [];
      }
    },
  },
});

// Mock Phaser globally
Object.defineProperty(global, 'Phaser', {
  value: {
    Easing: { Linear: { None: 1 } },
    Point: class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
    },
    Polygon: class {
      constructor(points: any[]) {
        this.points = points || [];
      }
    },
  },
});

// Minimal stubs to satisfy Abolished ability code paths we use
const getPhaserMock = () => ({ add: { tween: () => ({ to: () => ({ start: () => ({}) }) }) } });

// Avoid pulling in heavy engine modules from Creature imports
jest.mock('../../ability');
jest.mock('../../utility/hex', () => ({
  __esModule: true,
  default: () => undefined,
}));

// Import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AbolishedAbilities = require('../../abilities/Abolished').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires

describe('Abolished - Bonfire Spring', () => {
  let G: any = {};

  beforeAll(() => {
    // Mock jQuery globally
    (global as any).$j = { extend: (target: any, ...sources: any[]) => Object.assign(target, ...sources) };
  });

  const setup = (opts: { upgraded: boolean; accumulated: number }) => {
    const captured: { distance?: number } = {};

    G = {} as any;
    // Stub only what we need
    G.grid = {
      getFlyingRange: (_x: number, _y: number, distance: number) => {
        captured.distance = distance;
        return [];
      },
    };
    G.Phaser = getPhaserMock();
    G.abilities = {} as any;
    G.activeCreature = { queryMove: jest.fn() };

    // Register abilities for Abolished (id 7)
    AbolishedAbilities(G);

    const abilityDef = G.abilities[7][2]; // Third ability: Bonfire Spring

    const creature = {
      x: 0,
      y: 0,
      size: 1,
      id: 1,
      accumulatedTeleportRange: opts.accumulated,
      // queryMove takes the computed range via grid.getFlyingRange; we don't need to do anything here
      queryMove: jest.fn(),
      adjacentHexes: () => [],
      hexagons: [] as any[],
      moveTo: (_hex: any, o: any) => {
        o?.callback?.();
      },
    };

    const ability = Object.assign({}, abilityDef, {
      creature,
      isUpgraded: () => opts.upgraded,
      testRequirements: () => true,
      getTargets: () => [],
      end: jest.fn(),
      animation: jest.fn(),
    });

    return { ability, creature, captured };
  };

  test('base range is 6 when not upgraded', () => {
    const { ability, captured } = setup({ upgraded: false, accumulated: 0 });
    ability.query();
    expect(captured.distance).toBe(6);
  });

  test('upgraded with zero accumulated still has range 6', () => {
    const { ability, captured } = setup({ upgraded: true, accumulated: 0 });
    ability.query();
    expect(captured.distance).toBe(6);
  });

  test('upgraded increases range by +1 per successful prior use', () => {
    const { ability, captured } = setup({ upgraded: true, accumulated: 2 });
    ability.query();
    expect(captured.distance).toBe(8);
  });

  test('activate increments accumulatedTeleportRange by 1 only when upgraded', () => {
    // Not upgraded does not increment
    {
      const { ability, creature } = setup({ upgraded: false, accumulated: 3 });
      ability.activate({ x: 1, y: 1 });
      expect(creature.accumulatedTeleportRange).toBe(3);
    }

    // Upgraded increments by 1
    {
      const { ability, creature } = setup({ upgraded: true, accumulated: 3 });
      ability.activate({ x: 1, y: 1 });
      expect(creature.accumulatedTeleportRange).toBe(4);
    }
  });
});
