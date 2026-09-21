import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { ArrowIcon } from '~/components/icons'

export function HeroContent() {
  return (
    <div className="flex flex-col items-start text-left">
      <p className="label-caps">SOCIAL FINANCE, TOGETHER</p>

      <h1 className="mt-3 text-[2.25rem] leading-[1.15] text-ink sm:text-[2.75rem] lg:text-[3rem]">
        Contribute together. Split what you owe.
      </h1>

      <p className="mt-4 max-w-md text-base leading-7 text-ink-muted">
        Cowri is a social finance app for joint savings circles and splitting payments with
        people you trust.
      </p>

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
        <Link to="/register">
          <Button variant="primary" size="lg" trailing={<ArrowIcon size={18} />}>
            Get started
          </Button>
        </Link>
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  )
}