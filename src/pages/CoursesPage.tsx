import GlassCard from '../components/GlassCard';
import { Play, Clock } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';

export default function CoursesPage() {
  const { setCurrentPage } = useNavigation();

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-bold gradient-text text-[40px]" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Education
            </h1>
            <p className="text-gray-400 mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Premium courses, playbooks, and internal knowledge to scale your creative business.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Agency Scaling', category: 'Growth', progress: 65, lessons: 24, duration: '8 hours', image: '/src/media/course_agency_scaling.png' },
          { title: 'Content Creation 101', category: 'Creative', progress: 30, lessons: 18, duration: '6 hours', image: '/src/media/course_content_creation.png' },
          { title: 'Social Media Strategy', category: 'Marketing', progress: 90, lessons: 15, duration: '5 hours', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800' },
          { title: 'SEO Fundamentals', category: 'Strategy', progress: 0, lessons: 20, duration: '7 hours', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800' },
          { title: 'Email Marketing', category: 'Retention', progress: 45, lessons: 12, duration: '4 hours', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800' },
          { title: 'Video Production', category: 'Creative', progress: 20, lessons: 22, duration: '9 hours', image: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80&w=800' },
          { title: 'Agency Operations', category: 'Operations', progress: 10, lessons: 30, duration: '12 hours', image: 'https://images.unsplash.com/photo-1454165833767-02a698d58745?auto=format&fit=crop&q=80&w=800' },
          { title: 'Client Acquisition', category: 'Sales', progress: 0, lessons: 16, duration: '5 hours', image: 'https://images.unsplash.com/photo-1521791136064-7986c2923216?auto=format&fit=crop&q=80&w=800' },
          { title: 'Personal Branding', category: 'Presence', progress: 75, lessons: 14, duration: '4 hours', image: 'https://images.unsplash.com/photo-1507679799987-c7377ec48696?auto=format&fit=crop&q=80&w=800' },
        ].map((course, i) => (
          <GlassCard key={i} className="group overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold uppercase tracking-wider">
                  {course.category}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-gray-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Play size={14} className="text-[#3AA3EB]" />
                      {course.lessons} lessons
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-[#3AA3EB]" />
                      {course.duration}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  <span>Progress</span>
                  <span className="text-white font-medium">{course.progress}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#3AA3EB] to-[#2a92da] h-full rounded-full transition-all duration-1000" style={{ width: `${course.progress}%` }}></div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('course-single')}
                className={`w-full py-3 rounded-lg transition-all font-bold text-sm uppercase tracking-wider ${course.progress === 0
                  ? 'bg-[#3AA3EB] hover:bg-[#2a92da] text-white shadow-lg shadow-[#3AA3EB]/20'
                  : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {course.progress === 0 ? 'Start Course' : 'Continue Learning'}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
