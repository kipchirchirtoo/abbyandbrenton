import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import StoryCarousel from '@/components/site/StoryCarousel';
import PrivateAccess from '@/components/PrivateAccess';
import { getSiteAccess } from '@/lib/guest-session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Our Story — Abigael & Brenton' };

export default async function OurStory() {
  const access = await getSiteAccess();
  if (!access.allowed) return <PrivateAccess reason={access.reason} />;

  return (
    <>
      <PageHero eyebrow="Our story" title="How it began" sub="A simple meeting, a shared cup of coffee, and a conversation that changed everything." image="/photos/proposal/hero-3.jpg" collage={[
        { src: '/photos/proposal/story-1.jpg', pos: 'center 22%' },
        { src: '/photos/proposal/story-2.jpg', pos: 'center 30%' },
        { src: '/photos/proposal/story-3.jpg', pos: 'center 18%' },
        { src: '/photos/proposal/story-4.jpg', pos: 'center 66%' },
        { src: '/photos/proposal/story-5.jpg', pos: 'center 40%' },
      ]} />

      <section className="reveal section">
        <p className="eyebrow">Once upon a time</p>
        <h2>Written in the stars</h2>
        <div className="divider" />
        <p className="lead">
          Some love stories are written in the stars. Ours began with a simple meeting, a shared cup of coffee, and a
          conversation neither of us knew would change our lives forever.
        </p>
        <StoryCarousel />
      </section>

      <section className="reveal section wide">
        <div className="stories">
          <article className="story">
            <p className="eyebrow">Brenton&apos;s story</p>
            <h3>The way I love her</h3>
            <p>Loving you was the easiest thing I have ever done. Somewhere between our first conversations, the endless laughter, and the little moments we shared, I found myself falling for you in ways I never imagined possible.</p>
            <p>You became my favourite thought in the middle of a busy day, my peace in moments of uncertainty, and the person I wanted beside me through every season of life. I fell in love with your smile, your heart, your beautiful imperfections, and the way you make even the simplest moments feel extraordinary.</p>
            <p>With you, love never felt like something I had to figure out. It felt natural. It felt like home. Every journey, every adventure, every late-night conversation only made me more certain that there was no one else I would rather do life with.</p>
            <p>And when I finally asked you to be mine forever, I wasn&apos;t just asking you to marry me. I was choosing my best friend, my greatest blessing, and the woman I want to wake up beside for the rest of my life.</p>
            <p className="quote">If I had to live our story a thousand times, I would still find my way to you. Every single time.</p>
          </article>
          <article className="story">
            <p className="eyebrow">Abigael&apos;s story</p>
            <h3>The way I love him</h3>
            <p>I never knew that one person could make the world feel so different until Brenton came into my life. What began as a simple meeting slowly became something I couldn&apos;t imagine living without.</p>
            <p>He became the person I wanted to tell everything to, the one whose presence could turn an ordinary day into my favourite memory. It wasn&apos;t just the grand gestures or the beautiful moments; it was the little things. The laughter, the conversations, the reassurance, and the countless ways he made me feel loved without even trying.</p>
            <p>Somewhere along the way, I realised that I wasn&apos;t just falling in love with him. I was falling in love with the life we were building together. With his dreams, his heart, his strength, and even the little things that make him who he is.</p>
            <p>Saying yes was one of the easiest decisions my heart has ever made. Because in him, I found more than a partner. I found my best friend, my safe place, and the person I want to share every tomorrow with.</p>
            <p className="quote">Brenton, if love is a journey, then you are my favourite destination. I would choose you in every lifetime, in every version of this world, and in every story yet to be written.</p>
          </article>
        </div>
      </section>

      <section className="reveal section">
        <div className="divider" />
        <p className="script big-script">And so, our forever begins…</p>
        <p className="lead" style={{ marginTop: 12 }}>
          Two hearts, two stories, one beautiful promise. The best chapters are still ahead of us, and we cannot wait to write them together.
        </p>
      </section>
    </>
  );
}
