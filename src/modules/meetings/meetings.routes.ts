import { Router } from 'express';
import { meetingsController } from './meetings.controller';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/meetings:
 *   post:
 *     summary: Create a new meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - participants
 *               - meetingDate
 *               - transcript
 *             properties:
 *               title:
 *                 type: string
 *                 example: Q4 Planning Meeting
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 example: ["alice@example.com", "bob@example.com"]
 *               meetingDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-02T14:00:00Z"
 *               transcript:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: "00:01:23"
 *                     speaker:
 *                       type: string
 *                       example: "Alice"
 *                     text:
 *                       type: string
 *                       example: "Let's discuss our Q4 goals"
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, asyncHandler(meetingsController.createMeeting.bind(meetingsController)));

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: Get all meetings for the authenticated user
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Items per page
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by title (partial match)
 *     responses:
 *       200:
 *         description: List of meetings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 traceId:
 *                   type: string
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     meetings:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, asyncHandler(meetingsController.getMeetings.bind(meetingsController)));

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Get a meeting by ID
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting details
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Meeting not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authMiddleware, asyncHandler(meetingsController.getMeetingById.bind(meetingsController)));

/**
 * @swagger
 * /api/meetings/{id}/analyze:
 *   post:
 *     summary: Analyze a meeting with AI
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting analyzed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 traceId:
 *                   type: string
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Meeting with analysis
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Meeting not found
 *       502:
 *         description: AI returned malformed response
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/analyze', authMiddleware, asyncHandler(meetingsController.analyzeMeeting.bind(meetingsController)));

export default router;
