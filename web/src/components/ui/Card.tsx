'use client';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export function Card({ className, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-800 dark:bg-[#1e1e1e] dark:text-gray-100', className)}
      {...props}
    />
  );
}
