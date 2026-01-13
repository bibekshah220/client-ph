-- Fix Function Search Path Mutable warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix overly permissive RLS policies by making them more specific
-- Drop and recreate the problematic policies

-- Fix sales insert policy
DROP POLICY IF EXISTS "Staff can create sales" ON public.sales;
CREATE POLICY "Staff can create sales" ON public.sales 
  FOR INSERT TO authenticated 
  WITH CHECK (
    auth.uid() = sold_by OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'pharmacist') OR 
    public.has_role(auth.uid(), 'cashier')
  );

-- Fix sale_items insert policy
DROP POLICY IF EXISTS "Staff can create sale items" ON public.sale_items;
CREATE POLICY "Staff can create sale items" ON public.sale_items 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sale_id AND s.sold_by = auth.uid()
    ) OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'pharmacist') OR 
    public.has_role(auth.uid(), 'cashier')
  );

-- Fix audit_logs insert policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);