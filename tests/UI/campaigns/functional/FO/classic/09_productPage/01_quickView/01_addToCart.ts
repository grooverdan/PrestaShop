// Import utils
import testContext from '@utils/testContext';

// Import pages
import {homePage} from '@pages/FO/classic/home';
import {cartPage} from '@pages/FO/classic/cart';
import {quickViewModal} from '@pages/FO/classic/modal/quickView';
import {blockCartModal} from '@pages/FO/classic/modal/blockCart';

import {
  type CartProductDetails,
  dataProducts,
  foClassicSearchResultsPage,
  type ProductAttribute,
  utilsPlaywright,
} from '@prestashop-core/ui-testing';

import {expect} from 'chai';
import {BrowserContext, Page} from 'playwright';

const baseContext: string = 'functional_FO_classic_productPage_quickView_addToCart';

/*
Scenario:
- Go to FO and add first product to cart by quick view
- Check product details in the cart modal
- Proceed to checkout and check product details in the cart
- Go to home page and search a customized product
- Check that add to cart button is disabled
 */
describe('FO - Product page - Quick view : Add to cart', async () => {
  let browserContext: BrowserContext;
  let page: Page;

  const checkProductDetails: CartProductDetails = {
    name: dataProducts.demo_1.name,
    price: dataProducts.demo_1.finalPrice,
    cartSubtotal: dataProducts.demo_1.finalPrice,
    totalTaxIncl: dataProducts.demo_1.finalPrice,
    quantity: 1,
    cartProductsCount: 1,
    cartShipping: 'Free',
  };

  const checkProductDetailsProducts: ProductAttribute[] = [
    {
      name: 'size',
      value: 'S',
    },
    {
      name: 'color',
      value: 'White',
    },
  ];

  // before and after functions
  before(async function () {
    browserContext = await utilsPlaywright.createBrowserContext(this.browser);
    page = await utilsPlaywright.newTab(browserContext);
  });

  after(async () => {
    await utilsPlaywright.closeBrowserContext(browserContext);
  });

  it('should go to FO home page', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'goToFoToCreateAccount', baseContext);

    await homePage.goToFo(page);

    const isHomePage = await homePage.isHomePage(page);
    expect(isHomePage).to.eq(true);
  });

  it('should add first product to cart by quick view', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'addToCartByQuickView', baseContext);

    await homePage.quickViewProduct(page, 1);
    await quickViewModal.addToCartByQuickView(page);

    const successMessage = await blockCartModal.getBlockCartModalTitle(page);
    expect(successMessage).to.contains(homePage.successAddToCartMessage);
  });

  it('should check product details from cart modal', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'checkProductDetailsInCartModal', baseContext);

    const result = await blockCartModal.getProductDetailsFromBlockCartModal(page);
    await Promise.all([
      expect(result.name).to.equal(checkProductDetails.name),
      expect(result.price).to.equal(checkProductDetails.price),
      expect(result.quantity).to.equal(checkProductDetails.quantity),
      expect(result.cartProductsCount).to.equal(checkProductDetails.cartProductsCount),
      expect(result.cartSubtotal).to.equal(checkProductDetails.price),
      expect(result.cartShipping).to.contains(checkProductDetails.cartShipping),
      expect(result.totalTaxIncl).to.equal(checkProductDetails.totalTaxIncl),
    ]);

    const productAttributesFromBlockCart = await blockCartModal.getProductAttributesFromBlockCartModal(page);
    await Promise.all([
      expect(productAttributesFromBlockCart.length).to.equal(2),
      expect(productAttributesFromBlockCart[0].name).to.equal(checkProductDetailsProducts[0].name),
      expect(productAttributesFromBlockCart[0].value).to.equal(checkProductDetailsProducts[0].value),
      expect(productAttributesFromBlockCart[1].name).to.equal(checkProductDetailsProducts[1].name),
      expect(productAttributesFromBlockCart[1].value).to.equal(checkProductDetailsProducts[1].value),
    ]);
  });

  it('should proceed to checkout and check the cart page', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'checkCartPage', baseContext);

    await blockCartModal.proceedToCheckout(page);

    const pageTitle = await cartPage.getPageTitle(page);
    expect(pageTitle).to.equal(cartPage.pageTitle);
  });

  it('should check product details', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'checkProductDetailsInCartPage', baseContext);

    const result = await cartPage.getProductDetail(page, 1);
    await Promise.all([
      expect(result.name).to.equal(dataProducts.demo_1.name),
      expect(result.regularPrice).to.equal(dataProducts.demo_1.retailPrice),
      expect(result.price).to.equal(dataProducts.demo_1.finalPrice),
      expect(result.discountPercentage).to.equal(`-${dataProducts.demo_1.specificPrice.discount}%`),
      expect(result.image).to.contains(dataProducts.demo_1.coverImage),
      expect(result.quantity).to.equal(checkProductDetails.quantity),
      expect(result.totalPrice).to.equal(checkProductDetails.totalTaxIncl),
    ]);

    const cartProductAttributes = await cartPage.getProductAttributes(page, 1);
    await Promise.all([
      expect(cartProductAttributes.length).to.equal(2),
      expect(cartProductAttributes[0].name).to.equal(checkProductDetailsProducts[0].name),
      expect(cartProductAttributes[0].value).to.equal(checkProductDetailsProducts[0].value),
      expect(cartProductAttributes[1].name).to.equal(checkProductDetailsProducts[1].name),
      expect(cartProductAttributes[1].value).to.equal(checkProductDetailsProducts[1].value),
    ]);
  });

  it('should go to home page', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'goToHomePage', baseContext);

    await homePage.goToHomePage(page);

    const isHomePage = await homePage.isHomePage(page);
    expect(isHomePage, 'Home page is not displayed').to.eq(true);
  });

  it(`should search for the product ${dataProducts.demo_14.name}`, async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'searchForProductCustomized', baseContext);

    await homePage.searchProduct(page, dataProducts.demo_14.name);

    const pageTitle = await foClassicSearchResultsPage.getPageTitle(page);
    expect(pageTitle).to.equal(foClassicSearchResultsPage.pageTitle);
  });

  it('should quick view the product and check that Add to cart button is disabled', async function () {
    await testContext.addContextItem(this, 'testIdentifier', 'checkAddToCartButton', baseContext);

    await foClassicSearchResultsPage.quickViewProduct(page, 1);

    const isDisabled = await quickViewModal.isAddToCartButtonDisabled(page);
    expect(isDisabled).to.eq(true);
  });
});
