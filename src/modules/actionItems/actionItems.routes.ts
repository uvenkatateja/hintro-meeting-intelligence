import { Router } from 'express';
import { actionItemsController } from './actionItems.controller';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/action-items:
 *   post:
 *     summary: Create a new action item
 *     tags: [Action Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task
 *               - assignee
 *               - meetingId
 *             properties:
 *               task:
 *                 type: string
 *                 example: Prepare Q4 budget report
 *               assignee:
 *                 type: string
 *                 example: John Doe
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-15T17:00:00Z"
 *               meetingId:
 *                 type: string
 *                 example: clxyz123
 *               citations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: "00:15:30"
 *     responses:
 *       201:
 *         description: Action item created successfully
 *       403:
 *         description: Forbidden - not meeting owner
 *       404:
 *         description: Meeting not found
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, asyncHandler(actionItemsController.createActionItem.bind(actionItemsController)));

/**
 * @swagger
 * /api/action-items/overdue:
 *   get:
 *     summary: Get all overdue action items
 *     tags: [Action Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of overdue action items with meeting titles
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
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/overdue', authMiddleware, asyncHandler(actionItemsController.getOverdueActionItems.bind(actionItemsController)));

/**
 * @swagger
 * /api/action-items:
 *   get:
 *     summary: Get all action items with optional filters
 *     tags: [Action Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED]
 *         description: Filter by status
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *         description: Filter by assignee name
 *       - in: query
 *         name: meetingId
 *         schema:
 *           type: string
 *         description: Filter by meeting ID
 *     responses:
 *       200:
 *         description: List of action items
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
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, asyncHandler(actionItemsController.getActionItems.bind(actionItemsController)));

/**
 * @swagger
 * /api/action-items/{id}/status:
 *   patch:
 *     summary: Update action item status
 *     tags: [Action Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Action item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED]
 *                 example: IN_PROGRESS
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition (completed items cannot be reopened)
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Action item not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/status', authMiddleware, asyncHandler(actionItemsController.updateActionItemStatus.bind(actionItemsController)));

export default router;
