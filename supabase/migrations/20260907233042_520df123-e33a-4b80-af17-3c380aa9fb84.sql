UPDATE public.profiles
SET cpf_cnpj = regexp_replace(cpf_cnpj, '\D', '', 'g')
WHERE cpf_cnpj IS NOT NULL
  AND cpf_cnpj <> regexp_replace(cpf_cnpj, '\D', '', 'g');