allItems: timelineWithProgress,
        upcomingMilestones: timelineWithProgress
          .filter(item => item.week_start > currentWeek)
          .slice(0, 3),
        recentlyCompleted: timelineWithProgress
          .filter(item => item.isCompleted && item.week_end >= currentWeek - 4)
          .slice(-3)
      };
    } catch (error) {
      logger.error('Get baby timeline error:', error);
      throw error;
    }
  }

  // Mark timeline item as completed
  async markTimelineItemCompleted(userId, babyId, timelineItemId, notes = '') {
    try {
      // Check if progress record exists
      const existing = await executeQuery(
        'SELECT id FROM user_timeline_progress WHERE user_id = ? AND baby_id = ? AND timeline_item_id = ?',
        [userId, babyId, timelineItemId]
      );

      if (existing.length > 0) {
        // Update existing record
        await executeQuery(
          `UPDATE user_timeline_progress 
           SET is_completed = TRUE, completed_at = NOW(), notes = ?
           WHERE user_id = ? AND baby_id = ? AND timeline_item_id = ?`,
          [notes, userId, babyId, timelineItemId]
        );
      } else {
        // Create new progress record
        await executeQuery(
          `INSERT INTO user_timeline_progress 
           (id, user_id, baby_id, timeline_item_id, is_completed, completed_at, notes, created_at)
           VALUES (?, ?, ?, ?, TRUE, NOW(), ?, NOW())`,
          [uuidv4(), userId, babyId, timelineItemId, notes]
        );
      }

      logger.info('Timeline item marked as completed', { userId, babyId, timelineItemId });
      return { message: 'Timeline item marked as completed' };
    } catch (error) {
      logger.error('Mark timeline item completed error:', error);
      throw error;
    }
  }

  // Get user's timeline progress
  async getUserTimelineProgress(userId, babyId) {
    try {
      const progress = await executeQuery(
        `SELECT utp.*, bti.title, bti.week_start, bti.week_end
         FROM user_timeline_progress utp
         JOIN baby_timeline_items bti ON utp.timeline_item_id = bti.id
         WHERE utp.user_id = ? AND utp.baby_id = ?
         ORDER BY bti.week_start ASC`,
        [userId, babyId]
      );

      return progress;
    } catch (error) {
      logger.error('Get user timeline progress error:', error);
      throw error;
    }
  }
}

module.exports = new TimelineService();