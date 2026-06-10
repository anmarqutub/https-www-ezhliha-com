--
-- PostgreSQL database dump
--

\restrict WLLOKgU4eTgePTyRD0vb2zjFhscVfFcnZWzp4u5HFnSO7U6f0j0aDDqwOTUzvYD

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: admin_activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.admin_activity_log VALUES ('7d139800-4328-4b63-ab64-fedc1086330c', '9a4b868b-e237-403f-9127-be3c655e48cc', 'admin@ezhliha.com', 'update', 'provider', '89712c74-91da-4586-b3f5-4e989b17f8e0', '{"name": "شانغريلا"}', '2026-06-01 11:02:13.566574+00');


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories VALUES ('396105e3-19c6-4cb2-9ff5-5e021061ce44', 'القاعات والاستراحات', 'القاعات والاستراحات', 'halls', '🏛️', 1, true, '2026-05-13 10:16:37.603671+00', '2026-05-20 10:03:07.182375+00', NULL);
INSERT INTO public.categories VALUES ('0f54845c-4dab-44b0-b885-15431a6c943a', 'تنسيق وتصميم الحفلات', 'تنسيق وتصميم الحفلات', 'تنسيق-وتصميم-الحفلات-irx68', '🥂🎈', 2, true, '2026-05-18 10:30:51.823677+00', '2026-05-20 10:03:07.182375+00', NULL);
INSERT INTO public.categories VALUES ('703cd4db-a460-4aeb-9d23-c84d8b1ab65d', 'الدعوات الالكترونية', 'الدعوات الالكترونية', 'الدعوات-الالكترونية-fupij', '📩', 4, true, '2026-05-18 10:35:35.921155+00', '2026-05-20 10:03:07.182375+00', NULL);
INSERT INTO public.categories VALUES ('a38e9ed7-da1f-4c1a-a9e4-d726e4b09aee', 'التصوير والتوثيق', 'التصوير والتوثيق', 'photographers', '📸', 5, true, '2026-05-13 10:16:37.603671+00', '2026-05-20 10:03:07.182375+00', NULL);
INSERT INTO public.categories VALUES ('8c20b433-2a83-4bee-8634-bb5e3292b044', 'إطلالة المناسبة', 'إطلالة المناسبة', 'إطلالة-المناسبة-g2r2v', '💇‍♀️', 6, true, '2026-05-19 12:45:37.774379+00', '2026-05-20 10:03:07.182375+00', NULL);
INSERT INTO public.categories VALUES ('2dd2dd34-d4af-4fcd-bdc0-6cd35ce65cce', 'السبا والخدمات المنزلية', 'السبا والخدمات المنزلية', 'Home Spa', '🏠', 7, true, '2026-05-18 06:25:25.194588+00', '2026-05-20 10:03:07.182375+00', NULL);
INSERT INTO public.categories VALUES ('27eb9696-04c8-4197-bf57-b0167bc63d34', 'خدمات إضافية', 'خدمات إضافية', 'خدمات-إضافية-v9auq', NULL, 9, true, '2026-05-18 10:33:56.392136+00', '2026-05-20 10:03:07.182375+00', NULL);
INSERT INTO public.categories VALUES ('d082044d-f7dd-4cb7-87d3-0269a76cb121', 'تفاصيل الضيافة', 'تفاصيل الضيافة', 'تفاصيل-الضيافة-31kso', NULL, 3, true, '2026-05-20 10:28:15.287769+00', '2026-05-20 10:28:15.287769+00', NULL);


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cities VALUES ('e49fe907-ae37-405e-ab06-5f022006124a', 'الرياض', 'Riyadh', 'riyadh', 1, true, '2026-05-13 10:16:37.603671+00', '2026-05-13 10:16:37.603671+00');
INSERT INTO public.cities VALUES ('b231524b-96f9-4fab-a193-8e8cb2f9c510', 'جدة', 'Jeddah', 'jeddah', 2, true, '2026-05-13 10:16:37.603671+00', '2026-05-13 10:16:37.603671+00');


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.profiles VALUES ('9a4b868b-e237-403f-9127-be3c655e48cc', 'admin@ezhliha.com', 'إزهليها أدمن', '0555545085', 'جدة', '2026-05-13 11:26:53.07771+00', '2026-05-13 11:26:53.07771+00');


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.subcategories VALUES ('1d539a6c-80f0-4c7b-aaed-0df74474802a', '8c20b433-2a83-4bee-8634-bb5e3292b044', 'خبيرات التجميل (مكياج)💄', 'خبيرات التجميل (مكياج)💄', 'مكياج-v8m2u', 1, true, '2026-05-20 10:26:09.322149+00', '2026-05-22 19:14:05.102015+00', 'e097c0ff-a3c0-46e7-93f9-9cce5fa7a774');
INSERT INTO public.subcategories VALUES ('d9e7d1a2-2fbf-43c7-9ca0-f49b686b28bc', '8c20b433-2a83-4bee-8634-bb5e3292b044', 'تصفيف الشعر  💇🏻‍♀️', 'تصفيف الشعر  💇🏻‍♀️', 'شعر-7qy8n', 2, true, '2026-05-20 10:26:56.059995+00', '2026-05-22 19:14:41.736243+00', 'e097c0ff-a3c0-46e7-93f9-9cce5fa7a774');
INSERT INTO public.subcategories VALUES ('808fa9a9-2dcd-4813-82cc-1a42066db7ec', '396105e3-19c6-4cb2-9ff5-5e021061ce44', 'قاعات فندقية', 'قاعات فندقية', 'قاعة-الجوهرة-8icz5', 1, true, '2026-05-18 08:56:40.089891+00', '2026-05-18 10:29:16.390026+00', NULL);
INSERT INTO public.subcategories VALUES ('0d6f0aa3-7bc1-4f6c-984c-f1ba7f674240', '396105e3-19c6-4cb2-9ff5-5e021061ce44', 'قصور أفراح', 'قصور أفراح', 'قاعة-ليلتي-n62jg', 2, true, '2026-05-18 08:56:53.71398+00', '2026-05-18 10:29:26.765778+00', NULL);
INSERT INTO public.subcategories VALUES ('e973fa61-b64a-4555-82ae-3c5e3bc510de', '396105e3-19c6-4cb2-9ff5-5e021061ce44', 'شاليهات واستراحات', 'شاليهات واستراحات', 'قاعة-الملكة-70n2a', 3, true, '2026-05-18 08:57:13.55202+00', '2026-05-18 10:29:57.657302+00', NULL);
INSERT INTO public.subcategories VALUES ('9e2df31c-3673-4210-b642-2be48110ff0c', '27eb9696-04c8-4197-bf57-b0167bc63d34', 'وصيفة العروسة', 'وصيفة العروسة', 'وصيفة-العروسة-n13v8', 0, true, '2026-05-22 19:15:41.469096+00', '2026-05-22 19:15:41.469096+00', NULL);
INSERT INTO public.subcategories VALUES ('e8d0f1f8-2909-436e-8aa1-3d927e63340f', '27eb9696-04c8-4197-bf57-b0167bc63d34', 'ركن تصوير (فوتوبوث)', 'ركن تصوير (فوتوبوث)', 'فوتوبوث-iciqr', 3, true, '2026-05-18 10:35:12.618879+00', '2026-05-22 19:17:08.186966+00', NULL);
INSERT INTO public.subcategories VALUES ('0fb3600d-c6e2-4649-9017-ed51ffd521a7', '27eb9696-04c8-4197-bf57-b0167bc63d34', 'ركن القهوة والحلويات', 'ركن القهوة والحلويات', 'ركن-القهوة-والحلويات-2n7bc', 2, true, '2026-05-18 10:34:45.48653+00', '2026-05-18 10:34:52.66935+00', NULL);
INSERT INTO public.subcategories VALUES ('2c337ed3-51e5-4b19-9ac3-ec550c1799f3', '27eb9696-04c8-4197-bf57-b0167bc63d34', 'مداخل العطور', 'مداخل العطور', 'مداخل-العطور-7cqw9', 1, true, '2026-05-18 10:34:31.885548+00', '2026-05-18 10:34:58.564328+00', NULL);
INSERT INTO public.subcategories VALUES ('12bca16c-8aa7-414f-98d3-ba52e44c991f', '703cd4db-a460-4aeb-9d23-c84d8b1ab65d', 'تصميم الدعوات', 'تصميم الدعوات', 'تصميم-الدعوات-k4ggo', 1, true, '2026-05-18 10:35:58.828849+00', '2026-05-18 10:35:58.828849+00', NULL);
INSERT INTO public.subcategories VALUES ('99313f71-2ad4-4823-a23f-394fe5519253', '703cd4db-a460-4aeb-9d23-c84d8b1ab65d', 'ارسال الدعوات', 'ارسال الدعوات', 'ارسال-الدعوات-s31q4', 2, true, '2026-05-18 10:36:20.272628+00', '2026-05-18 10:36:20.272628+00', NULL);
INSERT INTO public.subcategories VALUES ('e097c0ff-a3c0-46e7-93f9-9cce5fa7a774', '8c20b433-2a83-4bee-8634-bb5e3292b044', 'صوالين التجميل', 'صوالين التجميل', 'صوالين-التجميل-مكياج-شعر-s8cc8', 0, true, '2026-05-19 12:46:55.778911+00', '2026-05-20 10:26:27.248545+00', NULL);
INSERT INTO public.subcategories VALUES ('7594b558-c3dc-4de4-9a11-e9b66c9b132e', 'd082044d-f7dd-4cb7-87d3-0269a76cb121', 'الضيافة', 'الضيافة', 'الضيافة-x09oa', 0, true, '2026-05-22 19:10:35.158679+00', '2026-05-22 19:10:35.158679+00', NULL);
INSERT INTO public.subcategories VALUES ('edea1cfb-9a92-461b-aa83-13a5dc66d8a9', 'd082044d-f7dd-4cb7-87d3-0269a76cb121', 'البوفيهات', 'البوفيهات', 'البوفيهات-zibx7', 0, true, '2026-05-22 19:11:08.854711+00', '2026-05-22 19:11:08.854711+00', NULL);
INSERT INTO public.subcategories VALUES ('89b59f71-519a-494b-8589-d88528f86caa', 'd082044d-f7dd-4cb7-87d3-0269a76cb121', 'الصبابات و المباشرات', 'الصبابات و المباشرات', 'الصبابات-و-المباشرات-6evdh', 0, true, '2026-05-22 19:11:21.254948+00', '2026-05-22 19:11:21.254948+00', NULL);
INSERT INTO public.subcategories VALUES ('a8df4a26-7363-4455-8a58-b543b14334f8', 'a38e9ed7-da1f-4c1a-a9e4-d726e4b09aee', 'تصوير الكاميرا الاحترافي', 'تصوير الكاميرا الاحترافي', 'wedding-photo', 1, true, '2026-05-13 10:16:37.603671+00', '2026-05-22 19:12:28.786479+00', NULL);
INSERT INTO public.subcategories VALUES ('871e399b-3b88-418d-844a-3adae77afacf', 'a38e9ed7-da1f-4c1a-a9e4-d726e4b09aee', 'تصوير الجوال', 'تصوير الجوال', 'event-photo', 2, true, '2026-05-13 10:16:37.603671+00', '2026-05-22 19:12:41.083384+00', NULL);


--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.providers VALUES ('89712c74-91da-4586-b3f5-4e989b17f8e0', '808fa9a9-2dcd-4813-82cc-1a42066db7ec', 'b231524b-96f9-4fab-a193-8e8cb2f9c510', 'شانغريلا', NULL, 25000.00, 40000.00, NULL, NULL, '', NULL, false, NULL, 0, true, '2026-05-22 18:43:01.252156+00', '2026-06-01 11:02:12.801499+00', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: provider_images; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.provider_images VALUES ('40df8b08-fe98-48c4-93c2-3aabb082ae1e', '89712c74-91da-4586-b3f5-4e989b17f8e0', 'https://safulzxbedldleulbdsj.supabase.co/storage/v1/object/public/provider-images/89712c74-91da-4586-b3f5-4e989b17f8e0/1780310185472-0.png', 0, '2026-06-01 10:36:26.544425+00');
INSERT INTO public.provider_images VALUES ('970e0e59-9934-43e5-8920-7c96c9130a3c', '89712c74-91da-4586-b3f5-4e989b17f8e0', 'https://safulzxbedldleulbdsj.supabase.co/storage/v1/object/public/provider-images/89712c74-91da-4586-b3f5-4e989b17f8e0/1780310194274-0.png', 0, '2026-06-01 10:36:34.997005+00');


--
-- Data for Name: purchase_codes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_roles VALUES ('8d60af80-78b0-47bc-a70f-f0ffee4caf43', '9a4b868b-e237-403f-9127-be3c655e48cc', 'admin', '2026-05-13 11:26:53.07771+00');


--
-- PostgreSQL database dump complete
--

\unrestrict WLLOKgU4eTgePTyRD0vb2zjFhscVfFcnZWzp4u5HFnSO7U6f0j0aDDqwOTUzvYD

