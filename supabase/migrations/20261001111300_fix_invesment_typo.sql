-- Rename the misspelled category "Invesment" → "Investment" for every user
-- that has it. Covers both income and expense kinds.

do $$
declare
  fixed_count integer;
begin

  update public.categories
  set    name = 'Investment'
  where  name = 'Invesment';

  get diagnostics fixed_count = row_count;

  raise notice 'Renamed % "Invesment" category row(s) to "Investment"', fixed_count;

end;
$$;
