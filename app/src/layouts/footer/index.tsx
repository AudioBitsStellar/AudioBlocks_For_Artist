import { FaFacebookF, FaTwitter, FaInstagram, FaYoutube, FaEnvelope } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  return (
    <>
      <footer className="bg-zinc-900 text-[#A7AAB5] py-12">
        <div className="w-11/12 mx-auto items-center grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div>
            <Image src="/logo.png" alt="" height={90} width={90} className="mb-4" />
            <p className="text-sm">
              AudioBlock is a music platform that empowers artists to retain ownership of their
              music and earn fair revenue. Fans can discover, stream, and support artists directly.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-[#5B5C61] font-semibold mb-4">Navigation</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <Link href="#" className="hover:text-white">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Artist Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className='md:pt-7'>
            <h3 className="text-[#5B5C61] font-semibold mb-4">Support</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <Link href="#" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-[#5B5C61] font-semibold mb-4">Social Media</h3>
            <div className='space-y-4'>
            <p className="text-sm mb-3">
              For recent updates and news follow our social media feeds.
            </p>
            <div className="flex space-x-4 text-xl">
              <Link href="#" className="hover:text-white">
                <FaYoutube />
              </Link>
              <Link href="#" className="hover:text-white">
                <FaInstagram />
              </Link>
              <Link href="#" className="hover:text-white">
                <FaFacebookF />
              </Link>
              <Link href="#" className="hover:text-white">
                <FaTwitter />
              </Link>
              <Link href="#" className="hover:text-white">
                <FaEnvelope />
              </Link>
            </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;

