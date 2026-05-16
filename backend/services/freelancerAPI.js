const axios = require('axios');

const API_BASE = process.env.FREELANCER_API_BASE || 'https://www.freelancer.com/api';
const API_KEY = process.env.FREELANCER_API_KEY || '';
const API_SECRET = process.env.FREELANCER_API_SECRET || '';
const OAUTH_TOKEN = process.env.FREELANCER_OAUTH_TOKEN || '';

// Freelancer API client with OAuth credentials
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OAUTH_TOKEN}`,
    'freelancer-oauth-v1': OAUTH_TOKEN,
  },
  timeout: 30000,
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(config => {
  console.log(`📡 API Request: ${config.method.toUpperCase()} ${config.url}`);
  if (API_KEY) console.log(`   Using API Key: ${API_KEY.substring(0, 8)}...`);
  return config;
}, error => {
  console.error('❌ Request error:', error.message);
  return Promise.reject(error);
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error(`❌ API Error ${error.response.status}:`, error.response.data?.message || error.response.statusText);
      // Return error details for mock mode fallback
      return Promise.reject({
        ...error,
        status: error.response.status,
        message: error.response.data?.message || error.response.statusText,
      });
    } else {
      console.error('❌ API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ============ PROJECTS / JOBS ============

/**
 * Search for design projects on Freelancer.com
 */
async function searchProjects(options = {}) {
  const {
    keywords = ['logo design', 'banner design', 'web design', 'flyer design', 'brochure', 'business card', 'social media design', 'UI design', 'illustration'],
    minBudget = 10,
    maxBudget = 500,
    limit = 50,
    offset = 0,
    sort = 'time_updated',
    projectTypes = ['fixed'],
  } = options;

  try {
    const params = {
      'query': keywords.join(' OR '),
      'min_avg_price': minBudget,
      'max_avg_price': maxBudget,
      'limit': limit,
      'offset': offset,
      'sort_field': sort,
      'project_types[]': projectTypes,
      'compact': true,
      'job_details': true,
      'user_details': true,
      'project_statuses[]': ['active'],
    };

    const response = await apiClient.get('/projects/0.1/projects/active/', { params });

    if (response.data && response.data.result) {
      return {
        success: true,
        projects: response.data.result.projects || [],
        total: response.data.result.total_count || 0,
      };
    }

    return { success: true, projects: [], total: 0 };
  } catch (error) {
    console.error('❌ Error searching projects:', error.message);
    return {
      success: false,
      error: error.message,
      projects: [],
      total: 0,
    };
  }
}

/**
 * Get project details
 */
async function getProjectDetails(projectId) {
  try {
    const response = await apiClient.get(`/projects/0.1/projects/${projectId}/`, {
      params: {
        full_description: true,
        job_details: true,
        user_details: true,
        attachment_details: true,
      },
    });

    return {
      success: true,
      project: response.data.result,
    };
  } catch (error) {
    console.error(`❌ Error getting project ${projectId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Place a bid on a project
 */
async function placeBid(projectId, amount, period, description) {
  try {
    console.log(`💼 Placing bid on project ${projectId}: $${amount}`);

    const response = await apiClient.post('/projects/0.1/bids/', {
      project_id: parseInt(projectId, 10),
      amount: parseFloat(amount),
      period: parseInt(period, 10),
      description: description,
    });

    return {
      success: true,
      bid: response.data.result,
      message: `✅ Bid placed: $${amount}`,
    };
  } catch (error) {
    console.error(`❌ Error placing bid on project ${projectId}:`, error.message);
    return {
      success: false,
      error: error.message,
      message: `Failed to place bid: ${error.message}`,
      status: error.response?.status,
    };
  }
}

/**
 * Send message to project thread
 */
async function sendMessage(threadId, message) {
  try {
    console.log(`💬 Sending message to thread ${threadId}`);

    const response = await apiClient.post('/messages/0.1/messages/', {
      thread_id: parseInt(threadId, 10),
      message: message,
    });

    return {
      success: true,
      message: response.data.result,
      status: '✅ Message sent',
    };
  } catch (error) {
    console.error(`❌ Error sending message to thread ${threadId}:`, error.message);
    return {
      success: false,
      error: error.message,
      status: `Failed to send message: ${error.message}`,
      status: error.response?.status,
    };
  }
}

/**
 * Submit deliverable for a project
 */
async function submitDeliverable(projectId, bidId, files = [], description = '') {
  try {
    console.log(`📦 Submitting deliverable for project ${projectId}`);

    const response = await apiClient.post('/projects/0.1/deliverables/', {
      project_id: parseInt(projectId, 10),
      bid_id: parseInt(bidId, 10),
      files: files,
      description: description,
    });

    return {
      success: true,
      deliverable: response.data.result,
      status: '✅ Deliverable submitted',
    };
  } catch (error) {
    console.error(`❌ Error submitting deliverable:`, error.message);
    return {
      success: false,
      error: error.message,
      status: `Failed to submit deliverable: ${error.message}`,
      statusCode: error.response?.status,
    };
  }
}

/**
 * Request milestone payment
 */
async function requestMilestone(projectId, bidId, amount, description) {
  try {
    console.log(`💰 Requesting milestone: $${amount} for project ${projectId}`);

    const response = await apiClient.post('/projects/0.1/milestones/', {
      project_id: parseInt(projectId, 10),
      bid_id: parseInt(bidId, 10),
      amount: parseFloat(amount),
      description: description,
    });

    return {
      success: true,
      milestone: response.data.result,
      status: '✅ Milestone requested',
    };
  } catch (error) {
    console.error(`❌ Error requesting milestone:`, error.message);
    return {
      success: false,
      error: error.message,
      status: `Failed to request milestone: ${error.message}`,
      statusCode: error.response?.status,
    };
  }
}

// ============ MESSAGES ============

/**
 * Get messages for a thread/project
 */
async function getMessages(threadId, limit = 50) {
  try {
    const response = await apiClient.get('/messages/0.1/messages/', {
      params: {
        threads: [threadId],
        limit: limit,
      },
    });

    return {
      success: true,
      messages: response.data.result.messages || [],
    };
  } catch (error) {
    console.error(`❌ Error getting messages for thread ${threadId}:`, error.message);
    return { success: false, error: error.message, messages: [] };
  }
}

/**
 * Send a message in a thread
 */
async function sendMessage(threadId, message) {
  try {
    const response = await apiClient.post('/messages/0.1/messages/', {
      thread_id: threadId,
      message: message,
    });

    return {
      success: true,
      message: response.data.result,
    };
  } catch (error) {
    console.error(`❌ Error sending message to thread ${threadId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get threads (conversations)
 */
async function getThreads(limit = 50) {
  try {
    const response = await apiClient.get('/messages/0.1/threads/', {
      params: {
        limit: limit,
        message_count: 1,
      },
    });

    return {
      success: true,
      threads: response.data.result.threads || [],
    };
  } catch (error) {
    console.error('❌ Error getting threads:', error.message);
    return { success: false, error: error.message, threads: [] };
  }
}

// ============ MILESTONES & PAYMENTS ============

/**
 * Request milestone payment
 */
async function requestMilestone(projectId, bidId, amount, description) {
  try {
    const response = await apiClient.post('/projects/0.1/milestones/', {
      project_id: projectId,
      bid_id: bidId,
      amount: amount,
      description: description,
    });

    return {
      success: true,
      milestone: response.data.result,
    };
  } catch (error) {
    console.error(`❌ Error requesting milestone for project ${projectId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get user profile (self)
 */
async function getSelfProfile() {
  try {
    const response = await apiClient.get('/users/0.1/self/');
    return {
      success: true,
      user: response.data.result,
    };
  } catch (error) {
    console.error('❌ Error getting self profile:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  searchProjects,
  getProjectDetails,
  placeBid,
  getMessages,
  sendMessage,
  getThreads,
  requestMilestone,
  getSelfProfile,
};
