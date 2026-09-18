import React from 'react';
import { 
  Palette, 
  Sparkles, 
  Type, 
  Layout, 
  Sliders, 
  Check, 
  Eye, 
  RotateCcw, 
  Zap, 
  Layers, 
  Monitor, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Gauge, 
  Activity,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  CreditCard,
  Hash
} from 'lucide-react';
import { SystemSettings } from '../../types';

interface AppearanceThemeStudioProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

export const THEME_COLORS: {
  id: NonNullable<SystemSettings['themeColor']>;
  name: string;
  enName: string;
  hex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  gradientClass: string;
  description: string;
}[] = [
  {
    id: 'amber',
    name: 'العنبر الذهبي الفاخر',
    enName: 'Voltera Amber (Default)',
    hex: '#f59e0b',
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-500',
    textClass: 'text-amber-400',
    gradientClass: 'from-amber-500 to-orange-500',
    description: 'السمة الرسمية المعتمدة لمحطات التوليد والطاقة، طاقة متوهجة ووضوح عالي.'
  },
  {
    id: 'blue',
    name: 'الأزرق الكهربائي الياقوتي',
    enName: 'Electric Sapphire',
    hex: '#3b82f6',
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-400',
    gradientClass: 'from-blue-500 to-indigo-600',
    description: 'سمة عصرية متزنة ومثالية للشركات والمؤسسات الكبرى والعمل المحاسبي.'
  },
  {
    id: 'emerald',
    name: 'الزمرد الأخضر المتجدد',
    enName: 'Emerald Energy',
    hex: '#10b981',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-400',
    gradientClass: 'from-emerald-500 to-teal-600',
    description: 'سمة مستوحاة من الطاقة النظيفة والشمسية، مريحة للعين في الجلسات الطويلة.'
  },
  {
    id: 'purple',
    name: 'البنفسجي السيبراني التقني',
    enName: 'Cyber Purple',
    hex: '#8b5cf6',
    bgClass: 'bg-purple-500',
    borderClass: 'border-purple-500',
    textClass: 'text-purple-400',
    gradientClass: 'from-purple-500 to-fuchsia-600',
    description: 'طابع تقني فائق الحداثة يجمع بين الأناقة والعمق الرقمي.'
  },
  {
    id: 'cyan',
    name: 'السماوي النيون المتوهج',
    enName: 'Cyan Radiant',
    hex: '#06b6d4',
    bgClass: 'bg-cyan-500',
    borderClass: 'border-cyan-500',
    textClass: 'text-cyan-400',
    gradientClass: 'from-cyan-500 to-blue-500',
    description: 'وضوح استثنائي تحت الإضاءة الميدانية وتوهج عالي التباين.'
  },
  {
    id: 'slate',
    name: 'الرمادي التكتيكي الهادئ',
    enName: 'Tactical Slate',
    hex: '#64748b',
    bgClass: 'bg-slate-500',
    borderClass: 'border-slate-500',
    textClass: 'text-slate-300',
    gradientClass: 'from-slate-600 to-slate-800',
    description: 'سمة كلاسيكية محايدة بدون تشتيت بصري، تركيز كامل على البيانات المحاسبية.'
  },
  {
    id: 'rose',
    name: 'الوردي الياقوتي المميز',
    enName: 'Ruby Rose',
    hex: '#f43f5e',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-500',
    textClass: 'text-rose-400',
    gradientClass: 'from-rose-500 to-pink-600',
    description: 'طابع ديناميكي قوي وتنبيهات بصرية لافتة.'
  }
];

export const ARABIC_FONTS: {
  id: NonNullable<SystemSettings['fontFamily']>;
  name: string;
  sub: string;
  sample: string;
  description: string;
}[] = [
  {
    id: 'Cairo',
    name: 'خط القاهرة (Cairo)',
    sub: 'الخط الافتراضي المعتمد للفوترة والأرقام',
    sample: 'محطة كهرباء العاصمة: القراءة الحالية 14,890 ك.و - المبلغ: 45,000 ر.ي',
    description: 'خط هندسي حديث يمتاز بدقة قراءة الأرقام والبيانات الإحصائية على كافة الشاشات.'
  },
  {
    id: 'Tajawal',
    name: 'خط تجوال (Tajawal)',
    sub: 'خط تنفيذي متزن للتقارير الرسمية',
    sample: 'محطة كهرباء العاصمة: القراءة الحالية 14,890 ك.و - المبلغ: 45,000 ر.ي',
    description: 'خط انسيابي وعصري يمنح التقارير والسندات طابعاً إدارياً رفيع المستوى.'
  },
  {
    id: 'Readex Pro',
    name: 'خط ريديكس برو (Readex Pro)',
    sub: 'خفيف ومريح للعمل الميداني السريع',
    sample: 'محطة كهرباء العاصمة: القراءة الحالية 14,890 ك.و - المبلغ: 45,000 ر.ي',
    description: 'خط مصمم خصيصاً للشاشات الرقمية والأجهزة اللوحية لتسهيل القراءة السريعة.'
  },
  {
    id: 'IBM Plex Sans Arabic',
    name: 'خط آي بي إم بلكس (IBM Plex Arabic)',
    sub: 'هندسي ومحاسبي عالي الدقة',
    sample: 'محطة كهرباء العاصمة: القراءة الحالية 14,890 ك.و - المبلغ: 45,000 ر.ي',
    description: 'خط تقني متوازن يعطي واجهات الجداول والقوائم المالية وضوحاً هندسياً فريداً.'
  },
  {
    id: 'Almarai',
    name: 'خط المراعي (Almarai)',
    sub: 'ناعم وجمالي للمطبوعات الفاخرة',
    sample: 'محطة كهرباء العاصمة: القراءة الحالية 14,890 ك.و - المبلغ: 45,000 ر.ي',
    description: 'خط عربي كلاسيكي حديث يضفي لمسة راقية وجمالية على واجهات النظام.'
  }
];

export const SIDEBAR_STYLES: {
  id: NonNullable<SystemSettings['sidebarStyle']>;
  name: string;
  description: string;
  bgPreview: string;
}[] = [
  {
    id: 'midnight',
    name: 'الداكن الكربوني (Midnight Obsidian)',
    description: 'خلفية سوداء حالكة مع تباين فائق وعزل بصري تام للقوائم.',
    bgPreview: 'bg-slate-950 border-slate-800'
  },
  {
    id: 'slate',
    name: 'الكلاسيكي المتوازن (Slate Classic)',
    description: 'درجات الرمادي الفحمي الهادئ لراحة العين وتناسق العناصر.',
    bgPreview: 'bg-slate-900 border-slate-800'
  },
  {
    id: 'glass',
    name: 'الزجاجي المصنفر (Frosted Glass)',
    description: 'شفافية عصرية متدرجة مع تمويه بصري ناعم وجمالية فائقة.',
    bgPreview: 'bg-slate-900/80 backdrop-blur-md border-slate-700/60'
  },
  {
    id: 'navy',
    name: 'الكحلي الملكي العميق (Royal Navy)',
    description: 'درجة كحلية داكنة توحي بالثبات والجدية المحاسبية للمؤسسات.',
    bgPreview: 'bg-slate-950 border-blue-900/30'
  }
];

export const AppearanceThemeStudio: React.FC<AppearanceThemeStudioProps> = ({
  settings,
  onUpdateSettings
}) => {
  const currentTheme = settings.themeColor || 'amber';
  const currentFont = settings.fontFamily || 'Cairo';
  const currentSidebar = settings.sidebarStyle || 'midnight';
  const currentDensity = settings.layoutDensity || 'standard';
  const animationsEnabled = settings.animationsEnabled !== false;
  const pulseStatusIndicators = settings.pulseStatusIndicators !== false;
  const highContrastFields = settings.highContrastFields || false;
  const soundEffectsEnabled = settings.soundEffectsEnabled || false;

  const activeColorObj = THEME_COLORS.find(c => c.id === currentTheme) || THEME_COLORS[0];

  const handleResetAppearance = () => {
    if (window.confirm('هل ترغب في استعادة المظهر الافتراضي للنظام (العنبر الذهبي + خط القاهرة + النمط الكربوني)؟')) {
      onUpdateSettings({
        ...settings,
        themeColor: 'amber',
        fontFamily: 'Cairo',
        sidebarStyle: 'midnight',
        layoutDensity: 'standard',
        animationsEnabled: true,
        pulseStatusIndicators: true,
        highContrastFields: false,
        soundEffectsEnabled: false
      });
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Banner */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={handleResetAppearance}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2 px-3.5 rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>استعادة المظهر الافتراضي</span>
          </button>

          <div className="text-right">
            <h4 className="font-black text-amber-400 text-sm flex items-center justify-end gap-2">
              <span>استوديو تخصيص المظهر وسمات واجهة النظام (Theme Studio)</span>
              <Palette className="w-5 h-5" />
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تخصيص الألوان المعتمدة، الخطوط العربية، أنماط القوائم، وكثافة العرض لتناسب بيئة تشغيل المحطة.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">السمة النشطة حالياً:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeColorObj.hex }} />
              {activeColorObj.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">الخط المعتمد:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-bold">
              {currentFont}
            </span>
          </div>
        </div>
      </div>

      {/* 1. PRIMARY ACCENT COLOR PALETTE */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-slate-500 font-mono text-[10px] uppercase">Primary Accent Theme</span>
          <h5 className="font-black text-slate-200 text-xs flex items-center gap-1.5">
            <span>السمة اللونية الأساسية للنظام (Accent Theme)</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h5>
        </div>

        <p className="text-xs text-slate-400">
          اختر اللون الرئيسي الذي يعكس هوية محطتك ويبرز الأزرار، الشارات، العناوين، ومؤشرات الطاقة عبر كافة الشاشات:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {THEME_COLORS.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, themeColor: theme.id })}
                className={`p-4 rounded-xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-950 border-2 shadow-xl'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
                style={{
                  borderColor: isSelected ? theme.hex : undefined,
                  boxShadow: isSelected ? `0 0 20px ${theme.hex}25` : undefined
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-950 shadow-md shrink-0"
                      style={{ backgroundColor: theme.hex }}
                    >
                      {isSelected ? <Check className="w-4 h-4 text-slate-950 stroke-[3]" /> : <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />}
                    </div>
                    {isSelected && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-black border font-mono"
                        style={{ 
                          backgroundColor: `${theme.hex}15`, 
                          borderColor: `${theme.hex}40`,
                          color: theme.hex 
                        }}
                      >
                        نشط الآن
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <h6 className="font-bold text-white text-xs">{theme.name}</h6>
                    <span className="text-[10px] text-slate-400 font-mono block" dir="ltr">{theme.enName}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {theme.description}
                </p>

                {/* Color swatches preview */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-900">
                  <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: theme.hex }} />
                  <div className="h-2 w-6 rounded-full opacity-60" style={{ backgroundColor: theme.hex }} />
                  <div className="h-2 w-3 rounded-full opacity-30" style={{ backgroundColor: theme.hex }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ARABIC TYPOGRAPHY & FONTS */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-slate-500 font-mono text-[10px] uppercase">Arabic Typography Engine</span>
          <h5 className="font-black text-slate-200 text-xs flex items-center gap-1.5">
            <span>الخط الطباعي العربي للنظام (Arabic Font Family)</span>
            <Type className="w-4 h-4 text-amber-400" />
          </h5>
        </div>

        <p className="text-xs text-slate-400">
          اختر الخط المعتمد لعرض واجهات النظام، الفواتير، التقارير المالية، والأرقام الحسابية:
        </p>

        <div className="space-y-3">
          {ARABIC_FONTS.map((font) => {
            const isSelected = currentFont === font.id;
            return (
              <div
                key={font.id}
                onClick={() => onUpdateSettings({ ...settings, fontFamily: font.id })}
                className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-950 border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                      isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-slate-900 border-slate-700 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <h6 className="font-black text-white text-xs">{font.name}</h6>
                        <span className="text-[10px] text-slate-400">({font.sub})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{font.description}</p>
                    </div>
                  </div>

                  {/* Font Sample Text */}
                  <div 
                    className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 text-xs text-amber-300 font-bold"
                    style={{ fontFamily: font.id }}
                  >
                    {font.sample}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SIDEBAR & DENSITY CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sidebar Style */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-500 font-mono text-[10px] uppercase">Sidebar Navigation Style</span>
            <h5 className="font-black text-slate-200 text-xs flex items-center gap-1.5">
              <span>نمط الشريط الجانبي والقوائم</span>
              <Layout className="w-4 h-4 text-amber-400" />
            </h5>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SIDEBAR_STYLES.map((style) => {
              const isSelected = currentSidebar === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, sidebarStyle: style.id })}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-950 border-amber-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <h6 className="font-bold text-xs">{style.name}</h6>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{style.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layout Density */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-500 font-mono text-[10px] uppercase">Interface Density</span>
            <h5 className="font-black text-slate-200 text-xs flex items-center gap-1.5">
              <span>كثافة الواجهة والأبعاد (Layout Density)</span>
              <Sliders className="w-4 h-4 text-amber-400" />
            </h5>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: 'standard',
                name: 'قياسي مريح (Standard)',
                desc: 'مساحات متوازنة وأزرار لمس مريحة للشاشات المكتبية والأجهزة اللوحية.'
              },
              {
                id: 'compact',
                name: 'مدمج ومكثف (Compact Pro)',
                desc: 'حجم مدمج ومسافات مصغرة لعرض أكبر عدد من صفوف الجداول والمشتركين.'
              }
            ].map((den) => {
              const isSelected = currentDensity === den.id;
              return (
                <button
                  key={den.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, layoutDensity: den.id as any })}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-950 border-amber-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <h6 className="font-bold text-xs">{den.name}</h6>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{den.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. VISUAL EFFECTS & BEHAVIOR TOGGLES */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-slate-500 font-mono text-[10px] uppercase">Motion & Sensory Experience</span>
          <h5 className="font-black text-slate-200 text-xs flex items-center gap-1.5">
            <span>مؤثرات العرض والحركة والتفاعل الحي</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </h5>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Smooth Animations */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">الانتقالات الحركية السلسة (Smooth Transitions)</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">تفعيل حركات الفتح السلس للمودالز وتأثيرات التنقل بين التبويبات.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, animationsEnabled: !animationsEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                animationsEnabled ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                animationsEnabled ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

          {/* Pulse Status Indicators */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">مؤشرات الحالة النابضة الحية (Pulse Status)</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">توهج نبضي لمؤشرات اتصال السحابة، العدادات النشطة، والاشتراكات.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, pulseStatusIndicators: !pulseStatusIndicators })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                pulseStatusIndicators ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                pulseStatusIndicators ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

          {/* High Contrast Field View */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">وضع التباين الميداني العالي (High Contrast)</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">زيادة وضوح النصوص وحدود الجداول لتسهيل العمل تحت ضوء الشمس الساطع.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, highContrastFields: !highContrastFields })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                highContrastFields ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                highContrastFields ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

          {/* Sound Effects */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">المؤثرات الصوتية للتأكيد (Audio Feedback)</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">إصدار صوت تأكيد لطيف عند تسجيل القراءات وترحيل السندات بنجاح.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, soundEffectsEnabled: !soundEffectsEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                soundEffectsEnabled ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                soundEffectsEnabled ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

        </div>
      </div>

      {/* 5. INTERACTIVE LIVE THEME SANDBOX */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            معاينة فورية
          </span>
          <h5 className="font-black text-slate-200 text-xs flex items-center gap-1.5">
            <span>صندوق المعاينة الحية والتفاعلية (Theme Live Sandbox)</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </h5>
        </div>

        <p className="text-xs text-slate-400">
          هكذا ستبدو أزرار الإجراءات، بطاقات المشتركين، وقيم الفواتير بالسمة والخط المختارين حالياً:
        </p>

        {/* Live Simulation Card */}
        <div 
          className="bg-slate-950 p-5 rounded-2xl border-2 space-y-4 text-right transition-all"
          style={{ 
            borderColor: `${activeColorObj.hex}60`,
            fontFamily: currentFont 
          }}
        >
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <span 
                className="px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5"
                style={{
                  backgroundColor: `${activeColorObj.hex}15`,
                  borderColor: `${activeColorObj.hex}40`,
                  color: activeColorObj.hex
                }}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                اشتراك سكني نشط
              </span>

              <span className="px-2 py-0.5 bg-slate-900 text-slate-400 rounded-lg text-[10px] font-mono">
                عداد: #MTR-88402
              </span>
            </div>

            <div className="text-right">
              <h6 className="font-black text-white text-sm">{settings.stationName || 'محطة العاصمة للكهرباء التجارية'}</h6>
              <span className="text-[10px] text-slate-400 font-mono">المشترك: الحاج عبدالكريم الأصبحي</span>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block">القراءة الحالية</span>
              <span className="font-mono text-white font-black text-sm">18,450 ك.و</span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block">الاستهلاك الفعلي</span>
              <span className="font-mono font-black text-sm" style={{ color: activeColorObj.hex }}>
                150 ك.و/س
              </span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block">سعر الكيلوواط</span>
              <span className="font-mono text-white font-black text-sm">
                {settings.tariffs?.residential ?? 0} {settings.currency}
              </span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block">الإجمالي المستحق</span>
              <span className="font-mono font-black text-sm text-emerald-400">
                {(150 * (settings.tariffs?.residential ?? 0) + (settings.fixedFee ?? 0)).toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>

          {/* Action Buttons with Active Theme */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-900">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: activeColorObj.hex }}
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>ترحيل وسداد الفاتورة</span>
              </button>

              <button
                type="button"
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-2 px-3.5 rounded-xl text-xs border border-slate-800 flex items-center gap-1.5"
              >
                <span>طباعة سند حراري</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-500 font-mono">
              Font: {currentFont} | Theme: {activeColorObj.name}
            </span>
          </div>

        </div>
      </div>

    </div>
  );
};
