select policyname, cmd, roles::text, coalesce(qual, '') as using_expr, coalesce(with_check, '') as check_expr
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
 order by policyname;
