-- DEVELOPMENT DRAFT. Do not apply blindly to production.
-- Adds narrowly-scoped conditional seller requirements while preserving the
-- existing fail-closed country rules model.
ALTER TABLE public.seller_country_requirements
 ADD COLUMN IF NOT EXISTS conditional_requirements jsonb NOT NULL DEFAULT '[]'::jsonb
 CHECK (jsonb_typeof(conditional_requirements) = 'array');

-- Expected item shape:
-- {"when_field":"is_business_registered","equals":true,
--  "required_fields":["registration_number"],
--  "required_documents":["business_registration"]}
--
-- Conditions are intentionally limited to boolean business_info facts.
-- Production deployment should validate live schema/RPC parity first.

CREATE OR REPLACE FUNCTION public.seller_conditional_requirements(
 p_business_info jsonb,
 p_rules jsonb
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $$
DECLARE item jsonb; result jsonb := '{"required_fields":[],"required_documents":[]}'::jsonb;
DECLARE field_name text; expected boolean; actual boolean;
BEGIN
 IF jsonb_typeof(coalesce(p_rules,'[]'::jsonb)) <> 'array' THEN
  RAISE EXCEPTION 'Conditional requirements must be an array';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_rules,'[]'::jsonb)) LOOP
  field_name := item->>'when_field';
  IF field_name IS NULL OR jsonb_typeof(item->'equals') <> 'boolean' THEN
   RAISE EXCEPTION 'Invalid conditional seller requirement';
  END IF;
  expected := (item->>'equals')::boolean;
  actual := lower(coalesce(p_business_info->>field_name,'false')) = 'true';
  IF actual = expected THEN
   result := jsonb_build_object(
    'required_fields', (result->'required_fields') || coalesce(item->'required_fields','[]'::jsonb),
    'required_documents', (result->'required_documents') || coalesce(item->'required_documents','[]'::jsonb)
   );
  END IF;
 END LOOP;
 RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.seller_conditional_requirements(jsonb,jsonb) FROM PUBLIC;

-- Deployment patch must also update submit_seller_application() so the server,
-- not the browser, enforces activated requirements. This helper is designed
-- to be called after loading the matching seller_country_requirements row:
--
-- conditional := public.seller_conditional_requirements(a.business_info, r.conditional_requirements);
-- FOREACH code IN ARRAY r.required_fields || ARRAY(SELECT jsonb_array_elements_text(conditional->'required_fields')) LOOP ...
-- FOREACH code IN ARRAY r.required_documents || ARRAY(SELECT jsonb_array_elements_text(conditional->'required_documents')) LOOP ...
--
-- CA ca-v1 intended configuration (keep stripe_connect_enabled=false until E2E):
-- individual: required_documents={}
-- sole_proprietor:
--   conditional_requirements=[{"when_field":"is_business_registered","equals":true,
--     "required_fields":["registration_number"],"required_documents":["business_registration"]}]
-- company: required_fields={registration_number},
--          required_documents={incorporation_or_registration_document}
