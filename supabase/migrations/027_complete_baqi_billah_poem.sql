-- Complete the third poem (قطعه سوم) in Khwaja Baqi Billah article - add missing fourth line
-- The poem was previously shortened; it should have four lines (چهار بیت)

-- Dari version: add fourth line and update note
UPDATE public.articles
SET body = replace(
  replace(body,
    'هر که درونش را خانهٔ دوست کرد»</p>',
    'هر که درونش را خانهٔ دوست کرد<br/>در سینه‌اش، ذکرِ خفی رهِ یار آورد»</p>'
  ),
  'قطعه سوم به‌صورت کوتاه نقل شده و در همین حد، بر محور',
  'این قطعه بر محور'
)
WHERE title = 'خواجه باقی‌بالله؛ احیای نقشبندیه و تربیت شاگردان اثرگذار'
  AND language = 'dari'
  AND body LIKE '%هر که درونش را خانهٔ دوست کرد%'
  AND body NOT LIKE '%در سینه‌اش، ذکرِ خفی رهِ یار آورد%';

-- Pashto version: add fourth line and update Pashto explanation
UPDATE public.articles
SET body = replace(
  replace(body,
    'هر که درونش را خانهٔ دوست کرد»</p>',
    'هر که درونش را خانهٔ دوست کرد<br/>در سینه‌اش، ذکرِ خفی رهِ یار آورد»</p>'
  ),
  'عشق یوازې په ظاهري ژبه نه تشریح کېږي؛ اصلي فهم یې د زړه په کور کې پیدا کېږي.',
  'عشق یوازې په ظاهري ژبه نه تشریح کېږي؛ چې څوک زړه د دوست کور وګرځوي، د خاموش ذکر په برکت یې رهِ یار په سینه کې موندل کېږي.'
)
WHERE title = 'خواجه باقي‌بالله: د نقشبندۍ تجدید او د شاګرد روزنه'
  AND language = 'pashto'
  AND body LIKE '%هر که درونش را خانهٔ دوست کرد%'
  AND body NOT LIKE '%در سینه‌اش، ذکرِ خفی رهِ یار آورد%';
