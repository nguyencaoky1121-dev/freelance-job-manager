const axios = require('axios');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

class AIEngine {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = 'gemini-2.0-flash';
  }

  /**
   * Analyze GitHub issue and extract detailed requirements
   */
  async analyzeIssueRequirements(issueTitle, issueBody) {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'GEMINI_API_KEY not configured',
        };
      }

      const prompt = `Analyze this GitHub issue and extract detailed requirements:

Title: ${issueTitle}

Description:
${issueBody}

Please provide a JSON response with:
{
  "taskType": "bug_fix|feature|refactor|documentation|other",
  "difficulty": "easy|medium|hard",
  "estimatedHours": number,
  "requiredSkills": ["skill1", "skill2"],
  "mainObjective": "clear description of what needs to be done",
  "acceptanceCriteria": ["criterion1", "criterion2"],
  "technicalDetails": "specific technical requirements",
  "filesThatNeedChanges": ["file1.js", "file2.ts"],
  "testingStrategy": "how to test the solution",
  "potentialChallenges": ["challenge1", "challenge2"],
  "suggestedApproach": "step-by-step approach to solve this"
}`;

      const response = await axios.post(
        `${GEMINI_API_BASE}/${this.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        },
        {
          params: {
            key: this.apiKey,
          },
          timeout: 30000,
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = response.data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            analysis,
          };
        }
      }

      return {
        success: false,
        error: 'Failed to parse AI response',
      };
    } catch (error) {
      console.error('❌ Error analyzing issue:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate solution code based on requirements
   */
  async generateSolution(issueAnalysis, existingCode = '') {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'GEMINI_API_KEY not configured',
        };
      }

      const prompt = `You are an expert developer. Generate a complete solution for this GitHub issue.

Issue Analysis:
${JSON.stringify(issueAnalysis, null, 2)}

${existingCode ? `Existing Code:\n${existingCode}\n` : ''}

Requirements:
1. Write clean, production-ready code
2. Follow best practices and conventions
3. Include error handling
4. Add comments for complex logic
5. Make sure it passes the acceptance criteria
6. Return ONLY the code, no explanations

Generate the complete solution code:`;

      const response = await axios.post(
        `${GEMINI_API_BASE}/${this.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        },
        {
          params: {
            key: this.apiKey,
          },
          timeout: 30000,
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const code = response.data.candidates[0].content.parts[0].text;
        return {
          success: true,
          code: code.replace(/```[\w]*\n?/g, '').trim(),
        };
      }

      return {
        success: false,
        error: 'Failed to generate solution',
      };
    } catch (error) {
      console.error('❌ Error generating solution:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate test cases for the solution
   */
  async generateTests(issueAnalysis, solutionCode) {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'GEMINI_API_KEY not configured',
        };
      }

      const prompt = `Generate comprehensive test cases for this solution.

Issue Analysis:
${JSON.stringify(issueAnalysis, null, 2)}

Solution Code:
${solutionCode}

Generate test cases that:
1. Cover all acceptance criteria
2. Test edge cases
3. Verify error handling
4. Use Jest/Mocha format
5. Are production-ready

Return ONLY the test code, no explanations:`;

      const response = await axios.post(
        `${GEMINI_API_BASE}/${this.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        },
        {
          params: {
            key: this.apiKey,
          },
          timeout: 30000,
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const tests = response.data.candidates[0].content.parts[0].text;
        return {
          success: true,
          tests: tests.replace(/```[\w]*\n?/g, '').trim(),
        };
      }

      return {
        success: false,
        error: 'Failed to generate tests',
      };
    } catch (error) {
      console.error('❌ Error generating tests:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate PR description
   */
  async generatePRDescription(issueAnalysis, solutionCode) {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'GEMINI_API_KEY not configured',
        };
      }

      const prompt = `Generate a professional GitHub PR description for this solution.

Issue Analysis:
${JSON.stringify(issueAnalysis, null, 2)}

Solution Code:
${solutionCode}

Generate a PR description with:
1. Clear summary of changes
2. Why these changes were made
3. How to test the changes
4. Any breaking changes (if applicable)
5. Related issues/PRs

Format as markdown:`;

      const response = await axios.post(
        `${GEMINI_API_BASE}/${this.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        },
        {
          params: {
            key: this.apiKey,
          },
          timeout: 30000,
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const description = response.data.candidates[0].content.parts[0].text;
        return {
          success: true,
          description: description.trim(),
        };
      }

      return {
        success: false,
        error: 'Failed to generate PR description',
      };
    } catch (error) {
      console.error('❌ Error generating PR description:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Evaluate solution against acceptance criteria
   */
  async evaluateSolution(issueAnalysis, solutionCode, testResults) {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'GEMINI_API_KEY not configured',
        };
      }

      const prompt = `Evaluate if this solution meets all acceptance criteria.

Issue Analysis:
${JSON.stringify(issueAnalysis, null, 2)}

Solution Code:
${solutionCode}

Test Results:
${JSON.stringify(testResults, null, 2)}

Provide evaluation as JSON:
{
  "meetsAllCriteria": boolean,
  "criteriaStatus": {
    "criterion1": "met|not_met|partial",
    "criterion2": "met|not_met|partial"
  },
  "qualityScore": 0-100,
  "issues": ["issue1", "issue2"],
  "improvements": ["improvement1", "improvement2"],
  "readyForMerge": boolean,
  "feedback": "detailed feedback"
}`;

      const response = await axios.post(
        `${GEMINI_API_BASE}/${this.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        },
        {
          params: {
            key: this.apiKey,
          },
          timeout: 30000,
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = response.data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const evaluation = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            evaluation,
          };
        }
      }

      return {
        success: false,
        error: 'Failed to evaluate solution',
      };
    } catch (error) {
      console.error('❌ Error evaluating solution:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = { AIEngine };
