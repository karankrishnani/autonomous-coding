import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * Keyword suggestions organized by category
 */
const keywordSuggestions = {
  skills: [
    'React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'JavaScript',
    'UI/UX Design', 'Product Design', 'Graphic Design', 'Motion Graphics',
    'Data Analysis', 'Machine Learning', 'DevOps', 'Cloud Architecture',
    'Mobile Development', 'iOS Development', 'Android Development',
    'Full Stack', 'Frontend', 'Backend', 'API Development',
    'Database Design', 'System Architecture', 'Technical Writing'
  ],
  tools: [
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
    'AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes',
    'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
    'Git', 'GitHub', 'GitLab', 'Jira', 'Notion',
    'Vercel', 'Netlify', 'Heroku', 'Firebase'
  ],
  industry: [
    'SaaS', 'E-commerce', 'Fintech', 'Healthcare', 'EdTech',
    'Real Estate', 'Marketing', 'Advertising', 'Media', 'Entertainment',
    'Startup', 'Enterprise', 'B2B', 'B2C', 'Marketplace',
    'AI/ML', 'Blockchain', 'Web3', 'IoT', 'Cybersecurity'
  ]
};

/**
 * GET /api/keywords/suggestions
 * Get keyword suggestions organized by category
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      suggestions: keywordSuggestions,
      categories: ['skills', 'tools', 'industry'],
    });
  } catch (error) {
    console.error('Error fetching keyword suggestions:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
