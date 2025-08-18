const { executeQuery } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class TimelineService {
  // Get timeline items
  async getTimelineItems(options = {}) {
    try {
      const { category, weekStart, weekEnd } = options;
      
      let whereClause = 'WHERE is_active = TRUE';
      let queryParams = [];

      if (category) {
        whereClause += ' AND category = ?';
        queryParams.push(category);
      }

      if (weekStart !== undefined) {
        whereClause += ' AND week_start >= ?';
        queryParams.push(weekStart);
      }

      if (weekEnd !== undefined) {
        whereClause += ' AND week_end <= ?';
        queryParams.push(weekEnd);
      }

      const items = await executeQuery(
        `SELECT * FROM baby_timeline_items
         ${whereClause}
         ORDER BY week_start ASC, sort_order ASC`,
        queryParams
      );

      // Parse JSON fields
      const parsedItems = items.map(item => ({
        ...item,
        what_to_expect: JSON.parse(item.what_to_expect || '[]'),
        tips: JSON.parse(item.tips || '[]'),
        when_to_worry: JSON.parse(item.when_to_worry || '[]'),
        video_links: JSON.parse(item.video_links || '[]'),
        cdc_milestones: JSON.parse(item.cdc_milestones || '[]')
      }));

      return parsedItems;
    } catch (error) {
      logger.error('Get timeline items error:', error);
      throw error;
    }
  }

  // Get timeline item by ID
  async getTimelineItemById(id) {
    try {
      const items = await executeQuery(
        'SELECT * FROM baby_timeline_items WHERE id = ? AND is_active = TRUE',
        [id]
      );

      if (items.length === 0) {
        return null;
      }

      const item = items[0];
      
      // Parse JSON fields
      item.what_to_expect = JSON.parse(item.what_to_expect || '[]');
      item.tips = JSON.parse(item.tips || '[]');
      item.when_to_worry = JSON.parse(item.when_to_worry || '[]');
      item.video_links = JSON.parse(item.video_links || '[]');
      item.cdc_milestones = JSON.parse(item.cdc_milestones || '[]');

      return item;
    } catch (error) {
      logger.error('Get timeline item by ID error:', error);
      throw error;
    }
  }

  // Get timeline for specific baby
  async getBabyTimeline(babyId, userId) {
    try {
      // Get baby details
      const babies = await executeQuery(
        'SELECT date_of_birth FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      const baby = babies[0];
      const birthDate = new Date(baby.date_of_birth);
      const currentWeek = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

      // Get all timeline items
      const allItems = await this.getTimelineItems();

      // Get user's progress for this baby
      const progress = await executeQuery(
        `SELECT timeline_item_id, is_completed, completed_at, notes
         FROM user_timeline_progress
         WHERE user_id = ? AND baby_id = ?`,
        [userId, babyId]
      );

      const progressMap = progress.reduce((acc, p) => {
        acc[p.timeline_item_id] = p;
        return acc;
      }, {});

      // Combine timeline items with progress
      const timelineWithProgress = allItems.map(item => ({
        ...item,
        progress: progressMap[item.id] || null,
        isAccessible: currentWeek >= item.week_start,
        isCurrent: currentWeek >= item.week_start && currentWeek <= item.week_end,
        isCompleted: currentWeek > item.week_end || (progressMap[item.id]?.is_completed === 1)
      }));

      // Filter relevant items (current week ± 4 weeks for main view)
      const relevantItems = timelineWithProgress.filter(item => 
        item.week_start >= Math.max(0, currentWeek - 4) && 
        item.week_start <= currentWeek + 8
      );

      return {
        currentWeek,
        babyAgeInWeeks: currentWeek,
        items: relevantItems,
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
      // Verify baby belongs to user
      const babies = await executeQuery(
        'SELECT id FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      // Check if timeline item exists
      const timelineItems = await executeQuery(
        'SELECT id FROM baby_timeline_items WHERE id = ? AND is_active = TRUE',
        [timelineItemId]
      );

      if (timelineItems.length === 0) {
        throw new Error('Timeline item not found');
      }

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
      // Verify baby belongs to user
      const babies = await executeQuery(
        'SELECT id FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      const progress = await executeQuery(
        `SELECT utp.*, bti.title, bti.week_start, bti.week_end, bti.category
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

  // Get timeline items by week range
  async getTimelineItemsByWeekRange(startWeek, endWeek) {
    try {
      const items = await executeQuery(
        `SELECT * FROM baby_timeline_items
         WHERE is_active = TRUE 
           AND ((week_start >= ? AND week_start <= ?) 
                OR (week_end >= ? AND week_end <= ?)
                OR (week_start <= ? AND week_end >= ?))
         ORDER BY week_start ASC, sort_order ASC`,
        [startWeek, endWeek, startWeek, endWeek, startWeek, endWeek]
      );

      // Parse JSON fields
      const parsedItems = items.map(item => ({
        ...item,
        what_to_expect: JSON.parse(item.what_to_expect || '[]'),
        tips: JSON.parse(item.tips || '[]'),
        when_to_worry: JSON.parse(item.when_to_worry || '[]'),
        video_links: JSON.parse(item.video_links || '[]'),
        cdc_milestones: JSON.parse(item.cdc_milestones || '[]')
      }));

      return parsedItems;
    } catch (error) {
      logger.error('Get timeline items by week range error:', error);
      throw error;
    }
  }

  // Get timeline items by category
  async getTimelineItemsByCategory(category) {
    try {
      const items = await executeQuery(
        `SELECT * FROM baby_timeline_items
         WHERE category = ? AND is_active = TRUE
         ORDER BY week_start ASC, sort_order ASC`,
        [category]
      );

      // Parse JSON fields
      const parsedItems = items.map(item => ({
        ...item,
        what_to_expect: JSON.parse(item.what_to_expect || '[]'),
        tips: JSON.parse(item.tips || '[]'),
        when_to_worry: JSON.parse(item.when_to_worry || '[]'),
        video_links: JSON.parse(item.video_links || '[]'),
        cdc_milestones: JSON.parse(item.cdc_milestones || '[]')
      }));

      return parsedItems;
    } catch (error) {
      logger.error('Get timeline items by category error:', error);
      throw error;
    }
  }

  // Calculate baby's current week from birth date
  calculateCurrentWeek(birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  // Get milestone summary for baby
  async getMilestoneSummary(babyId, userId) {
    try {
      // Get baby details
      const babies = await executeQuery(
        'SELECT date_of_birth FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      const currentWeek = this.calculateCurrentWeek(babies[0].date_of_birth);

      // Get milestone items only
      const milestones = await executeQuery(
        `SELECT * FROM baby_timeline_items
         WHERE category = 'milestone' AND is_active = TRUE
         ORDER BY week_start ASC`,
        []
      );

      // Get user's progress
      const progress = await executeQuery(
        `SELECT timeline_item_id, is_completed, completed_at
         FROM user_timeline_progress
         WHERE user_id = ? AND baby_id = ?`,
        [userId, babyId]
      );

      const progressMap = progress.reduce((acc, p) => {
        acc[p.timeline_item_id] = p;
        return acc;
      }, {});

      // Categorize milestones
      const completed = [];
      const current = [];
      const upcoming = [];

      milestones.forEach(milestone => {
        const isCompleted = currentWeek > milestone.week_end || 
                          (progressMap[milestone.id]?.is_completed === 1);
        const isCurrent = currentWeek >= milestone.week_start && 
                         currentWeek <= milestone.week_end;

        const milestoneWithProgress = {
          ...milestone,
          what_to_expect: JSON.parse(milestone.what_to_expect || '[]'),
          tips: JSON.parse(milestone.tips || '[]'),
          when_to_worry: JSON.parse(milestone.when_to_worry || '[]'),
          video_links: JSON.parse(milestone.video_links || '[]'),
          cdc_milestones: JSON.parse(milestone.cdc_milestones || '[]'),
          progress: progressMap[milestone.id] || null,
          isCompleted,
          isCurrent
        };

        if (isCompleted) {
          completed.push(milestoneWithProgress);
        } else if (isCurrent) {
          current.push(milestoneWithProgress);
        } else if (currentWeek < milestone.week_start) {
          upcoming.push(milestoneWithProgress);
        }
      });

      return {
        currentWeek,
        completed: completed.slice(-3), // Last 3 completed
        current,
        upcoming: upcoming.slice(0, 3), // Next 3 upcoming
        totalMilestones: milestones.length,
        completedCount: completed.length
      };
    } catch (error) {
      logger.error('Get milestone summary error:', error);
      throw error;
    }
  }

  // Update timeline item progress notes
  async updateTimelineProgress(userId, babyId, timelineItemId, notes) {
    try {
      // Verify baby belongs to user
      const babies = await executeQuery(
        'SELECT id FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      // Check if progress record exists
      const existing = await executeQuery(
        'SELECT id FROM user_timeline_progress WHERE user_id = ? AND baby_id = ? AND timeline_item_id = ?',
        [userId, babyId, timelineItemId]
      );

      if (existing.length === 0) {
        throw new Error('Timeline progress record not found');
      }

      await executeQuery(
        'UPDATE user_timeline_progress SET notes = ? WHERE user_id = ? AND baby_id = ? AND timeline_item_id = ?',
        [notes, userId, babyId, timelineItemId]
      );

      return { message: 'Timeline progress notes updated successfully' };
    } catch (error) {
      logger.error('Update timeline progress error:', error);
      throw error;
    }
  }

  // Unmark timeline item as completed
  async unmarkTimelineItemCompleted(userId, babyId, timelineItemId) {
    try {
      // Verify baby belongs to user
      const babies = await executeQuery(
        'SELECT id FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      await executeQuery(
        `UPDATE user_timeline_progress 
         SET is_completed = FALSE, completed_at = NULL
         WHERE user_id = ? AND baby_id = ? AND timeline_item_id = ?`,
        [userId, babyId, timelineItemId]
      );

      logger.info('Timeline item unmarked as completed', { userId, babyId, timelineItemId });
      return { message: 'Timeline item unmarked as completed' };
    } catch (error) {
      logger.error('Unmark timeline item completed error:', error);
      throw error;
    }
  }

  // Get timeline statistics for user
  async getTimelineStatistics(userId) {
    try {
      // Get all user's babies
      const babies = await executeQuery(
        'SELECT id, name, date_of_birth FROM babies WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      if (babies.length === 0) {
        return {
          totalBabies: 0,
          totalMilestones: 0,
          completedMilestones: 0,
          currentMilestones: 0,
          upcomingMilestones: 0
        };
      }

      const babyIds = babies.map(b => b.id);
      const placeholders = babyIds.map(() => '?').join(',');

      // Get total milestones
      const totalMilestones = await executeQuery(
        'SELECT COUNT(*) as total FROM baby_timeline_items WHERE category = "milestone" AND is_active = TRUE'
      );

      // Get completed milestones for all babies
      const completedMilestones = await executeQuery(
        `SELECT COUNT(*) as completed
         FROM user_timeline_progress utp
         JOIN baby_timeline_items bti ON utp.timeline_item_id = bti.id
         WHERE utp.user_id = ? AND utp.baby_id IN (${placeholders}) 
           AND utp.is_completed = TRUE AND bti.category = 'milestone'`,
        [userId, ...babyIds]
      );

      // Calculate current and upcoming milestones for each baby
      let currentMilestones = 0;
      let upcomingMilestones = 0;

      for (const baby of babies) {
        const currentWeek = this.calculateCurrentWeek(baby.date_of_birth);
        
        const current = await executeQuery(
          `SELECT COUNT(*) as current
           FROM baby_timeline_items
           WHERE category = 'milestone' AND is_active = TRUE
             AND week_start <= ? AND week_end >= ?`,
          [currentWeek, currentWeek]
        );

        const upcoming = await executeQuery(
          `SELECT COUNT(*) as upcoming
           FROM baby_timeline_items
           WHERE category = 'milestone' AND is_active = TRUE
             AND week_start > ? AND week_start <= ?`,
          [currentWeek, currentWeek + 12] // Next 3 months
        );

        currentMilestones += current[0].current;
        upcomingMilestones += upcoming[0].upcoming;
      }

      return {
        totalBabies: babies.length,
        totalMilestones: totalMilestones[0].total,
        completedMilestones: completedMilestones[0].completed,
        currentMilestones,
        upcomingMilestones
      };
    } catch (error) {
      logger.error('Get timeline statistics error:', error);
      throw error;
    }
  }

  // Get timeline items for specific week
  async getTimelineItemsForWeek(weekNumber) {
    try {
      const items = await executeQuery(
        `SELECT * FROM baby_timeline_items
         WHERE is_active = TRUE 
           AND week_start <= ? AND week_end >= ?
         ORDER BY sort_order ASC`,
        [weekNumber, weekNumber]
      );

      // Parse JSON fields
      const parsedItems = items.map(item => ({
        ...item,
        what_to_expect: JSON.parse(item.what_to_expect || '[]'),
        tips: JSON.parse(item.tips || '[]'),
        when_to_worry: JSON.parse(item.when_to_worry || '[]'),
        video_links: JSON.parse(item.video_links || '[]'),
        cdc_milestones: JSON.parse(item.cdc_milestones || '[]')
      }));

      return parsedItems;
    } catch (error) {
      logger.error('Get timeline items for week error:', error);
      throw error;
    }
  }

  // Search timeline items
  async searchTimelineItems(searchTerm, options = {}) {
    try {
      const { category, weekStart, weekEnd } = options;
      
      let whereClause = 'WHERE is_active = TRUE AND (title LIKE ? OR description LIKE ?)';
      let queryParams = [`%${searchTerm}%`, `%${searchTerm}%`];

      if (category) {
        whereClause += ' AND category = ?';
        queryParams.push(category);
      }

      if (weekStart !== undefined) {
        whereClause += ' AND week_start >= ?';
        queryParams.push(weekStart);
      }

      if (weekEnd !== undefined) {
        whereClause += ' AND week_end <= ?';
        queryParams.push(weekEnd);
      }

      const items = await executeQuery(
        `SELECT * FROM baby_timeline_items
         ${whereClause}
         ORDER BY week_start ASC, sort_order ASC`,
        queryParams
      );

      // Parse JSON fields
      const parsedItems = items.map(item => ({
        ...item,
        what_to_expect: JSON.parse(item.what_to_expect || '[]'),
        tips: JSON.parse(item.tips || '[]'),
        when_to_worry: JSON.parse(item.when_to_worry || '[]'),
        video_links: JSON.parse(item.video_links || '[]'),
        cdc_milestones: JSON.parse(item.cdc_milestones || '[]')
      }));

      return parsedItems;
    } catch (error) {
      logger.error('Search timeline items error:', error);
      throw error;
    }
  }

  // Get timeline categories
  async getTimelineCategories() {
    try {
      const categories = await executeQuery(
        `SELECT category, COUNT(*) as item_count
         FROM baby_timeline_items
         WHERE is_active = TRUE
         GROUP BY category
         ORDER BY category ASC`
      );

      return categories;
    } catch (error) {
      logger.error('Get timeline categories error:', error);
      throw error;
    }
  }

  // Get baby's next milestone
  async getNextMilestone(babyId, userId) {
    try {
      // Get baby details
      const babies = await executeQuery(
        'SELECT date_of_birth FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      const currentWeek = this.calculateCurrentWeek(babies[0].date_of_birth);

      // Get next milestone
      const nextMilestone = await executeQuery(
        `SELECT * FROM baby_timeline_items
         WHERE category = 'milestone' AND is_active = TRUE AND week_start > ?
         ORDER BY week_start ASC
         LIMIT 1`,
        [currentWeek]
      );

      if (nextMilestone.length === 0) {
        return null;
      }

      const milestone = nextMilestone[0];
      
      // Parse JSON fields
      milestone.what_to_expect = JSON.parse(milestone.what_to_expect || '[]');
      milestone.tips = JSON.parse(milestone.tips || '[]');
      milestone.when_to_worry = JSON.parse(milestone.when_to_worry || '[]');
      milestone.video_links = JSON.parse(milestone.video_links || '[]');
      milestone.cdc_milestones = JSON.parse(milestone.cdc_milestones || '[]');

      // Calculate weeks until milestone
      milestone.weeksUntil = milestone.week_start - currentWeek;

      return milestone;
    } catch (error) {
      logger.error('Get next milestone error:', error);
      throw error;
    }
  }

  // Get baby's current milestone
  async getCurrentMilestone(babyId, userId) {
    try {
      // Get baby details
      const babies = await executeQuery(
        'SELECT date_of_birth FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      const currentWeek = this.calculateCurrentWeek(babies[0].date_of_birth);

      // Get current milestone
      const currentMilestone = await executeQuery(
        `SELECT * FROM baby_timeline_items
         WHERE category = 'milestone' AND is_active = TRUE 
           AND week_start <= ? AND week_end >= ?
         ORDER BY week_start DESC
         LIMIT 1`,
        [currentWeek, currentWeek]
      );

      if (currentMilestone.length === 0) {
        return null;
      }

      const milestone = currentMilestone[0];
      
      // Parse JSON fields
      milestone.what_to_expect = JSON.parse(milestone.what_to_expect || '[]');
      milestone.tips = JSON.parse(milestone.tips || '[]');
      milestone.when_to_worry = JSON.parse(milestone.when_to_worry || '[]');
      milestone.video_links = JSON.parse(milestone.video_links || '[]');
      milestone.cdc_milestones = JSON.parse(milestone.cdc_milestones || '[]');

      // Get progress for this milestone
      const progress = await executeQuery(
        `SELECT is_completed, completed_at, notes
         FROM user_timeline_progress
         WHERE user_id = ? AND baby_id = ? AND timeline_item_id = ?`,
        [userId, babyId, milestone.id]
      );

      milestone.progress = progress.length > 0 ? progress[0] : null;

      return milestone;
    } catch (error) {
      logger.error('Get current milestone error:', error);
      throw error;
    }
  }

  // Get timeline overview for dashboard
  async getTimelineOverview(userId) {
    try {
      // Get all user's babies
      const babies = await executeQuery(
        'SELECT id, name, date_of_birth FROM babies WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      if (babies.length === 0) {
        return {
          babies: [],
          totalMilestones: 0,
          completedMilestones: 0,
          currentMilestones: [],
          upcomingMilestones: []
        };
      }

      const overview = {
        babies: [],
        totalMilestones: 0,
        completedMilestones: 0,
        currentMilestones: [],
        upcomingMilestones: []
      };

      // Process each baby
      for (const baby of babies) {
        const currentWeek = this.calculateCurrentWeek(baby.date_of_birth);
        
        // Get baby's milestone summary
        const milestoneSummary = await this.getMilestoneSummary(baby.id, userId);
        
        // Get current milestone
        const currentMilestone = await this.getCurrentMilestone(baby.id, userId);
        
        // Get next milestone
        const nextMilestone = await this.getNextMilestone(baby.id, userId);

        const babyOverview = {
          id: baby.id,
          name: baby.name,
          currentWeek,
          ageInWeeks: currentWeek,
          currentMilestone,
          nextMilestone,
          completedMilestones: milestoneSummary.completedCount
        };

        overview.babies.push(babyOverview);
        
        // Add to overall counts
        overview.completedMilestones += milestoneSummary.completedCount;
        
        if (currentMilestone) {
          overview.currentMilestones.push({
            ...currentMilestone,
            babyName: baby.name,
            babyId: baby.id
          });
        }
        
        if (nextMilestone) {
          overview.upcomingMilestones.push({
            ...nextMilestone,
            babyName: baby.name,
            babyId: baby.id
          });
        }
      }

      // Get total milestones available
      const totalMilestones = await executeQuery(
        'SELECT COUNT(*) as total FROM baby_timeline_items WHERE category = "milestone" AND is_active = TRUE'
      );

      overview.totalMilestones = totalMilestones[0].total;

      // Sort upcoming milestones by weeks until
      overview.upcomingMilestones.sort((a, b) => (a.weeksUntil || 0) - (b.weeksUntil || 0));

      return overview;
    } catch (error) {
      logger.error('Get timeline overview error:', error);
      throw error;
    }
  }

  // Create custom timeline item (admin only)
  async createTimelineItem(itemData) {
    try {
      const {
        id,
        weekStart,
        weekEnd,
        title,
        shortTitle,
        description,
        category,
        icon,
        color,
        whatToExpect = [],
        tips = [],
        whenToWorry = [],
        videoLinks = [],
        cdcMilestones = [],
        sortOrder = 0
      } = itemData;

      await executeQuery(
        `INSERT INTO baby_timeline_items 
         (id, week_start, week_end, title, short_title, description, category, 
          icon, color, what_to_expect, tips, when_to_worry, video_links, 
          cdc_milestones, sort_order, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [
          id, weekStart, weekEnd, title, shortTitle, description, category,
          icon, color, JSON.stringify(whatToExpected), JSON.stringify(tips),
          JSON.stringify(whenToWorry), JSON.stringify(videoLinks),
          JSON.stringify(cdcMilestones), sortOrder
        ]
      );

      return await this.getTimelineItemById(id);
    } catch (error) {
      logger.error('Create timeline item error:', error);
      throw error;
    }
  }

  // Update timeline item (admin only)
  async updateTimelineItem(id, updateData) {
    try {
      const allowedFields = [
        'week_start', 'week_end', 'title', 'short_title', 'description',
        'category', 'icon', 'color', 'what_to_expect', 'tips', 'when_to_worry',
        'video_links', 'cdc_milestones', 'sort_order', 'is_active'
      ];
      
      const updateFields = [];
      const updateValues = [];

      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          if (['what_to_expect', 'tips', 'when_to_worry', 'video_links', 'cdc_milestones'].includes(dbField)) {
            updateFields.push(`${dbField} = ?`);
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateFields.push(`${dbField} = ?`);
            updateValues.push(updateData[key]);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateValues.push(id);

      await executeQuery(
        `UPDATE baby_timeline_items SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getTimelineItemById(id);
    } catch (error) {
      logger.error('Update timeline item error:', error);
      throw error;
    }
  }

  // Delete timeline item (admin only)
  async deleteTimelineItem(id) {
    try {
      // Soft delete by setting is_active to FALSE
      await executeQuery(
        'UPDATE baby_timeline_items SET is_active = FALSE WHERE id = ?',
        [id]
      );

      logger.info('Timeline item deleted (soft delete)', { timelineItemId: id });
      return { message: 'Timeline item deleted successfully' };
    } catch (error) {
      logger.error('Delete timeline item error:', error);
      throw error;
    }
  }

  // Get timeline progress summary for baby
  async getTimelineProgressSummary(babyId, userId) {
    try {
      // Verify baby belongs to user
      const babies = await executeQuery(
        'SELECT date_of_birth FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );

      if (babies.length === 0) {
        throw new Error('Baby not found or access denied');
      }

      const currentWeek = this.calculateCurrentWeek(babies[0].date_of_birth);

      // Get progress summary by category
      const progressSummary = await executeQuery(
        `SELECT 
           bti.category,
           COUNT(*) as total_items,
           COUNT(CASE WHEN utp.is_completed = TRUE THEN 1 END) as completed_items,
           COUNT(CASE WHEN bti.week_start <= ? AND bti.week_end >= ? THEN 1 END) as current_items,
           COUNT(CASE WHEN bti.week_start > ? THEN 1 END) as upcoming_items
         FROM baby_timeline_items bti
         LEFT JOIN user_timeline_progress utp ON bti.id = utp.timeline_item_id 
           AND utp.user_id = ? AND utp.baby_id = ?
         WHERE bti.is_active = TRUE
         GROUP BY bti.category
         ORDER BY bti.category ASC`,
        [currentWeek, currentWeek, currentWeek, userId, babyId]
      );

      return {
        currentWeek,
        categories: progressSummary
      };
    } catch (error) {
      logger.error('Get timeline progress summary error:', error);
      throw error;
    }
  }
}

module.exports = new TimelineService();