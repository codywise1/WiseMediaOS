import GlassCard from '../components/GlassCard';
import { BookOpen, Play, Clock } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';

export default function CoursesPage() {
  const { setCurrentPage } = useNavigation();

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Courses
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Marketing Masterclass', progress: 65, lessons: 24, duration: '8 hours' },
          { title: 'Content Creation 101', progress: 30, lessons: 18, duration: '6 hours' },
          { title: 'Social Media Strategy', progress: 90, lessons: 15, duration: '5 hours' },
          { title: 'SEO Fundamentals', progress: 0, lessons: 20, duration: '7 hours' },
          { title: 'Email Marketing', progress: 45, lessons: 12, duration: '4 hours' },
          { title: 'Video Production', progress: 20, lessons: 22, duration: '9 hours' },
        ].map((course, i) => (
          <GlassCard key={i}>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <BookOpen className="text-blue-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{course.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-gray-400">
                    <div className="flex items-center gap-1">
                      <Play size={14} />
                      {course.lessons} lessons
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {course.duration}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${course.progress}%` }}></div>
                </div>
              </div>
              <button onClick={() => setCurrentPage('course-single')} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
                {course.progress === 0 ? 'Start Course' : 'Continue Learning'}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
