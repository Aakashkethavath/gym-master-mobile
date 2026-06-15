/**
 * Exercise Service
 * ────────────────
 * Proxies requests to the ExerciseDB RapidAPI endpoint.
 *
 * Why proxy through the server?
 *  • The RapidAPI key is a secret — embedding it in the mobile app would
 *    expose it to anyone who decompiles the APK/IPA.
 *  • We enforce subscription checks before proxying.
 *  • We can cache responses server-side to reduce RapidAPI quota usage.
 *  • We can rate-limit per user independently of the global API quota.
 *
 * Caching strategy:
 *  • Exercise data changes infrequently (new exercises are added rarely).
 *  • We use an in-memory Map as a simple cache with a TTL.
 *  • For production with multiple replicas, replace with Redis.
 */

import https from 'node:https';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const EXERCISE_BASE = `https://${env.EXERCISE_API_HOST}`;

// Simple in-process cache: key → { data, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

const MOCK_EXERCISES = [
  {
    id: "ex_1",
    name: "Barbell Bench Press",
    bodyPart: "chest",
    equipment: "barbell",
    target: "pectorals",
    gifUrl: "https://media.giphy.com/media/l0HlUUJZ79jO7v6CY/giphy.gif",
    secondaryMuscles: ["triceps", "anterior deltoids"],
    instructions: [
      "Lie flat on the bench with your feet flat on the floor.",
      "Grip the barbell with hands slightly wider than shoulder-width.",
      "Unrack the bar and lower it slowly to your mid-chest.",
      "Push the bar back up powerfully to the starting position."
    ]
  },
  {
    id: "ex_2",
    name: "Dumbbell Bicep Curl",
    bodyPart: "upper arms",
    equipment: "dumbbell",
    target: "biceps",
    gifUrl: "https://media.giphy.com/media/3o7TKoWXm3okO1kgdW/giphy.gif",
    secondaryMuscles: ["forearms"],
    instructions: [
      "Stand tall with a dumbbell in each hand, palms facing forward.",
      "Keep your elbows close to your torso.",
      "Curl the weights while contracting your biceps.",
      "Slowly lower the dumbbells back to the starting position."
    ]
  },
  {
    id: "ex_3",
    name: "Bodyweight Pull-Up",
    bodyPart: "back",
    equipment: "body weight",
    target: "lats",
    gifUrl: "https://media.giphy.com/media/3o7TKoWXm3okO1kgdW/giphy.gif",
    secondaryMuscles: ["biceps", "middle trapezius"],
    instructions: [
      "Hang from a pull-up bar with an overhand grip, hands wider than shoulders.",
      "Pull your shoulder blades down and back.",
      "Pull your chest up to the bar by driving your elbows down.",
      "Lower yourself with control to a dead hang."
    ]
  },
  {
    id: "ex_4",
    name: "Barbell Back Squat",
    bodyPart: "upper legs",
    equipment: "barbell",
    target: "quads",
    gifUrl: "https://media.giphy.com/media/l0HlUUJZ79jO7v6CY/giphy.gif",
    secondaryMuscles: ["glutes", "hamstrings", "core"],
    instructions: [
      "Rest the barbell on your upper back muscles (traps).",
      "Stand with feet shoulder-width apart, toes slightly pointed out.",
      "Squat down by pushing your hips back and bending your knees.",
      "Go down until your thighs are parallel to the floor, then push back up."
    ]
  },
  {
    id: "ex_5",
    name: "Barbell Deadlift",
    bodyPart: "upper legs",
    equipment: "barbell",
    target: "glutes",
    gifUrl: "https://media.giphy.com/media/l0HlUUJZ79jO7v6CY/giphy.gif",
    secondaryMuscles: ["hamstrings", "lower back", "lats"],
    instructions: [
      "Stand with feet flat under the barbell, hip-width apart.",
      "Bend at the hips and knees, grip the bar with a flat back.",
      "Drive through your heels to stand up, keeping the bar close to your shins.",
      "Lock out your hips at the top, then lower the bar with control."
    ]
  },
  {
    id: "ex_6",
    name: "Dumbbell Overhead Shoulder Press",
    bodyPart: "shoulders",
    equipment: "dumbbell",
    target: "deltoids",
    gifUrl: "https://media.giphy.com/media/3o7TKoWXm3okO1kgdW/giphy.gif",
    secondaryMuscles: ["triceps"],
    instructions: [
      "Sit or stand with a dumbbell in each hand at shoulder height, elbows bent.",
      "Keep your core tight and back straight.",
      "Press the dumbbells directly overhead until arms are fully extended.",
      "Lower the weights slowly back to shoulder height."
    ]
  },
  {
    id: "ex_7",
    name: "Forearm Plank",
    bodyPart: "waist",
    equipment: "body weight",
    target: "abs",
    gifUrl: "https://media.giphy.com/media/3o7TKoWXm3okO1kgdW/giphy.gif",
    secondaryMuscles: ["shoulders", "glutes"],
    instructions: [
      "Place forearms on the floor, elbows aligned under shoulders.",
      "Extend legs straight behind you, toes tucked.",
      "Engage core and keep your body in a straight line from head to heels.",
      "Hold the position while breathing steadily."
    ]
  },
  {
    id: "ex_8",
    name: "Cable Seated Row",
    bodyPart: "back",
    equipment: "cable",
    target: "upper back",
    gifUrl: "https://media.giphy.com/media/l0HlUUJZ79jO7v6CY/giphy.gif",
    secondaryMuscles: ["biceps", "lats"],
    instructions: [
      "Sit at the cable row machine, feet on the platform, knees slightly bent.",
      "Grip the handle attachment and sit up straight.",
      "Pull the handle toward your lower abdomen, squeezing your shoulder blades.",
      "Extend your arms back forward slowly."
    ]
  },
  {
    id: "ex_9",
    name: "Running on Treadmill",
    bodyPart: "cardio",
    equipment: "body weight",
    target: "cardiovascular system",
    gifUrl: "https://media.giphy.com/media/3o7TKoWXm3okO1kgdW/giphy.gif",
    secondaryMuscles: ["quads", "calves"],
    instructions: [
      "Step onto the treadmill belt and attach the safety key.",
      "Set a comfortable walking pace to warm up.",
      "Increase speed to a jog or run according to your plan.",
      "Maintain upright posture and land on mid-foot."
    ]
  }
];

/**
 * Makes a GET request to the ExerciseDB API.
 *
 * @param {string} path - API path, e.g. '/exercises?limit=20&offset=0'
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fetchExercises(path) {
  const cacheKey = path;
  const cached = cacheGet(cacheKey);
  if (cached) {
    logger.debug({ path }, 'Exercise cache hit');
    return cached;
  }

  if (!env.EXERCISE_API_KEY) {
    logger.warn('EXERCISE_API_KEY not configured — returning mock demo exercise list');
    
    // Parse the query for limit and offset if any
    const limitMatch = /[?&]limit=(\d+)/.exec(path);
    const offsetMatch = /[?&]offset=(\d+)/.exec(path);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 20;
    const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;

    let result = MOCK_EXERCISES;

    if (path.includes('/exercises/bodyPart/')) {
      const parts = path.split('/exercises/bodyPart/');
      const term = decodeURIComponent(parts[1].split('?')[0]).toLowerCase().trim();
      result = MOCK_EXERCISES.filter(ex => ex.bodyPart.toLowerCase() === term);
    } else if (path.includes('/exercises/equipment/')) {
      const parts = path.split('/exercises/equipment/');
      const term = decodeURIComponent(parts[1].split('?')[0]).toLowerCase().trim();
      result = MOCK_EXERCISES.filter(ex => ex.equipment.toLowerCase() === term);
    } else if (path.includes('/exercises/name/')) {
      const parts = path.split('/exercises/name/');
      const term = decodeURIComponent(parts[1].split('?')[0]).toLowerCase().trim();
      result = MOCK_EXERCISES.filter(ex => ex.name.toLowerCase().includes(term));
    } else if (path.includes('/exercises/exercise/')) {
      const parts = path.split('/exercises/exercise/');
      const term = parts[1].split('?')[0].trim();
      const ex = MOCK_EXERCISES.find(e => e.id === term);
      return ex || null;
    }

    return result.slice(offset, offset + limit);
  }

  const url = `${EXERCISE_BASE}${path}`;
  logger.debug({ url }, 'Fetching exercises from RapidAPI');

  const data = await new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'X-RapidAPI-Key': env.EXERCISE_API_KEY,
          'X-RapidAPI-Host': env.EXERCISE_API_HOST,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error('Invalid JSON from ExerciseDB'));
            }
          } else {
            reject(new Error(`ExerciseDB returned ${res.statusCode}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('ExerciseDB timeout')); });
  });

  cacheSet(cacheKey, data);
  return data;
}
