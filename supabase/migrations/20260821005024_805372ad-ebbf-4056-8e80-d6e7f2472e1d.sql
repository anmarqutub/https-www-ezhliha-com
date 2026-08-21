insert into public.subcategories (name_ar, name_en, slug, category_id, sort_order)
select 'السبا المنزلي', 'Home Spa', 'home-spa', c.id, 1 from public.categories c
where c.name_ar = 'السبا والخدمات المنزلية'
and not exists (select 1 from public.subcategories s where s.name_ar = 'السبا المنزلي');