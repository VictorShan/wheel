# Spin the Wheel

_
It's lunchtime and you need to decide what to eat! You and your coworkers need to find a resturant
that everyone is fine with but no one is giving any options. Meanwhile, time is ticking and the
lines at different resturants grows longer by the second. A decision must be made now!
_

This is a simple wheel to help you pick an option out of multiple choices.

## Getting Started

To get started, open the website and pick a title for your wheel. Each wheel is given a randomly
generated URL that you can share. However, there is a chance that someone else might get the same
URL as you. The URL is a randomly generated CUID of length 10. After being automatically directed
to your wheel, you can add options to your wheel. Once you are done adding options, you can spin
the wheel and see what option is chosen.

## Features

- Spinning the wheel will randomly choose an option. Spinning the wheel on one device will spin the
  wheel on all devices that are viewing the same wheel.
- Each option can be given a URL that will be opened when the option is chosen.
- Once an option is "selected" using the button, the option will only have 20% of its original
  weight. This weight will restored by 20% every day.
- You can upvote or downvote an option. This will increase or decrease the weight of the option.

## Stack

- Next.js
- PlanetScale
- _Clerk (unused)_ - I was planning on using Clerk for authentication but I didn't think it was
  necessary for this project.

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.
