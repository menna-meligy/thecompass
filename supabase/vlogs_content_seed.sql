-- Latest Content (vlogs) seed — placeholder entries for the homepage "Latest Vlogs" section.
-- video_url values are placeholders (REPLACE_ME_n) — swap in real video links via /admin/vlogs
-- (delete the placeholder row, add the real one) or directly in Supabase before these go live.
-- Run in Supabase SQL Editor, both local and production, once real links are ready.

INSERT INTO public.vlogs (title_ar, title_en, description_ar, description_en, video_url, thumbnail_url)
VALUES
  (
    'إزاي تلاقي بوصلتك في شغلك',
    'Finding Your Compass at Work',
    'مش كل حد لازم يكون عارف طريقه من الأول. في الفيديو ده بحكي إزاي تبدأ تسأل الأسئلة الصح عشان توصل للاتجاه اللي يناسبك، مش اللي الناس حواليك بتقولك عليه.',
    'Not everyone has it figured out from day one — and that''s okay. In this video I walk through the questions that actually help you find your direction, instead of the one everyone around you keeps pushing.',
    'https://youtube.com/watch?v=REPLACE_ME_1',
    NULL
  ),
  (
    'لما تحس إنك تايه في مسارك المهني',
    'When You Feel Lost in Your Career',
    'التوهان مش معناه إنك فاشل، معناه إنك محتاج توقف شوية وتراجع. في الفيديو ده بشارك معاك الخطوات اللي بستخدمها مع عملائي لما يحسوا إنهم واقفين في نفس المكان من غير تقدم.',
    'Feeling lost doesn''t mean you''re failing — it means it''s time to pause and reassess. Here I share the exact steps I use with my clients when they feel stuck in the same place with no progress.',
    'https://youtube.com/watch?v=REPLACE_ME_2',
    NULL
  ),
  (
    'إزاي تبني هويتك المهنية',
    'Building Your Professional Identity',
    'هويتك المهنية مش بس السيرة الذاتية بتاعتك، هي إزاي بتتكلم عن نفسك وإزاي الناس بتحس بيك في أول خمس دقايق. في الفيديو ده بوريك إزاي تبني الصورة دي بثقة.',
    'Your professional identity isn''t just your CV — it''s how you talk about yourself and how people read you in the first five minutes. In this video I show you how to build that with confidence.',
    'https://youtube.com/watch?v=REPLACE_ME_3',
    NULL
  ),
  (
    'التفاوض على راتبك من غير خوف',
    'Negotiating Your Salary Without Fear',
    'كتير مننا بيوافق على أول رقم يتقالوله بس عشان مش عايز يبان طماع. في الفيديو ده بشرح إزاي تتفاوض بثقة وباحترافية من غير ما تحس بالذنب.',
    'A lot of us accept the first number just to avoid seeming greedy. Here I break down how to negotiate confidently and professionally, without the guilt.',
    'https://youtube.com/watch?v=REPLACE_ME_4',
    NULL
  ),
  (
    'التوازن بين شغلك وحياتك',
    'Balancing Your Work and Your Life',
    'النجاح المهني من غير توازن بيتعب في الآخر. في الفيديو ده بتكلم عن إزاي تحافظ على حماسك وطاقتك من غير ما تحرق نفسك في الطريق.',
    'Career success without balance eventually wears you down. In this video I talk about how to protect your energy and motivation without burning out along the way.',
    'https://youtube.com/watch?v=REPLACE_ME_5',
    NULL
  ),
  (
    'قبل ما تغيّر مسارك المهني بالكامل',
    'Before You Make a Full Career Change',
    'تغيير المسار قرار كبير، ولازم ياخد وقته. في الفيديو ده بشارك معاك الأسئلة اللي لازم تجاوب عليها بصدق قبل ما تاخد الخطوة دي، عشان تكون متأكد إنها الاتجاه الصح.',
    'Changing your career path is a big decision that deserves real thought. Here I share the questions you need to answer honestly before taking that leap, so you know it''s the right direction.',
    'https://youtube.com/watch?v=REPLACE_ME_6',
    NULL
  );
