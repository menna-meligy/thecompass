-- Invariant: a booking can only become "confirmed" once its payment receipt is
-- confirmed. For manual methods (InstaPay / Vodafone Cash) that means a PAID
-- payment WITH an uploaded proof; card payments (paymob) are paid via gateway
-- and need no image. This is the DB backstop behind the admin-UI gating.
create or replace function public.enforce_receipt_before_confirm()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'confirmed' and coalesce(old.status, '') is distinct from 'confirmed' then
    if not exists (
      select 1
      from public.payments p
      where p.booking_id = new.id
        and p.status = 'paid'
        and (p.method = 'paymob' or p.proof_url is not null)
    ) then
      raise exception
        'Cannot confirm booking %: its payment receipt has not been confirmed', new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_receipt_before_confirm on public.bookings;
create trigger trg_enforce_receipt_before_confirm
  before update on public.bookings
  for each row
  execute function public.enforce_receipt_before_confirm();
