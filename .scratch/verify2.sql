select p.role, count(*) n from profiles p group by p.role;
select u.email, p.role, (u.email_confirmed_at is not null) confirmed
  from auth.users u left join profiles p on p.id = u.id
 where u.email like '%albosla.test%'
 order by u.email;
