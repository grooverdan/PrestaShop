<?php
/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */

declare(strict_types=1);

namespace PrestaShop\PrestaShop\Core\Context;

use Doctrine\ORM\NoResultException;
use PrestaShop\PrestaShop\Adapter\ContextStateManager;
use PrestaShop\PrestaShop\Core\Domain\Shop\ValueObject\ShopConstraint;
use PrestaShop\PrestaShop\Core\Util\Inflector;
use PrestaShopBundle\Entity\Repository\TabRepository;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Tools;

class LegacyControllerContextBuilder implements LegacyContextBuilderInterface
{
    private ?string $controllerName = null;
    private ?string $redirectionUrl = null;
    private ?LegacyControllerContext $_legacyControllerContext = null;

    public function __construct(
        private readonly EmployeeContext $employeeContext,
        private readonly ContextStateManager $contextStateManager,
        private readonly array $controllersLockedToAllShopContext,
        private readonly TabRepository $tabRepository,
        private readonly ContainerInterface $container,
    ) {
    }

    public function build(): LegacyControllerContext
    {
        $multiShopContext = $this->getMultiShopContext($this->getControllerName());
        $id = $this->getTabId($this->getControllerName());
        $employeeId = '';
        if ($this->employeeContext->getEmployee()) {
            $employeeId = $this->employeeContext->getEmployee()->getId();
        }
        $token = Tools::getAdminToken($this->getControllerName() . $id . $employeeId);
        $overrideFolder = Tools::toUnderscoreCase(substr($this->getControllerName(), 5)) . '/';
        $controllerType = 'admin';
        $className = $this->getClassName($this->getControllerName());
        $table = $this->getTableFromClassName($this->getControllerName());

        $legacyControllerContext = new LegacyControllerContext(
            $this->container,
            $this->getControllerName(),
            $controllerType,
            $multiShopContext,
            $className,
            $id,
            $token,
            $overrideFolder,
            $this->getCurrentIndex(),
            $table,
        );

        $this->_legacyControllerContext = $legacyControllerContext;

        return $legacyControllerContext;
    }

    public function buildLegacyContext(): void
    {
        // In legacy pages the AdminController class already sets the context's controller, which is a more accurate
        // candidate than our facade meant for backward compatibility, so we leave it untouched
        if ($this->contextStateManager->getContext()->controller) {
            return;
        }

        if (null === $this->_legacyControllerContext) {
            $this->_legacyControllerContext = $this->build();
        }

        $this->contextStateManager->setController($this->_legacyControllerContext);
    }

    public function setControllerName(string $controllerName): self
    {
        if (str_ends_with($controllerName, 'ControllerOverride')) {
            $controllerName = preg_replace('/ControllerOverride$/', '', $controllerName);
        }
        if (str_ends_with($controllerName, 'Controller')) {
            $controllerName = preg_replace('/Controller$/', '', $controllerName);
        }

        $this->controllerName = $controllerName;

        return $this;
    }

    public function setRedirectionUrl(?string $redirectionUrl): self
    {
        $this->redirectionUrl = $redirectionUrl;

        return $this;
    }

    private function getControllerName(): string
    {
        return $this->controllerName ?? 'AdminNotFound';
    }

    /**
     * This function is designed to locate the object model corresponding to the current Legacy Controller.
     *
     * @param string $controllerName
     *
     * @return string|null
     */
    private function getClassName(string $controllerName): ?string
    {
        switch ($controllerName) {
            case 'AdminAccess':
                return 'Profile';
            case 'AdminCarrierWizard':
                return 'Carrier';
            case 'AdminImages':
                return 'ImageType';
            case 'AdminReturn':
                return 'OrderReturn';
            case 'AdminSearchConf':
                return 'Alias';
            case 'AdminConfigureFaviconBo':
                return 'Configuration';
            default:
                // Here, we use the controller's name to retrieve the object model's name, passing it in singular form.
                if (preg_match('/Admin([a-zA-Z]+)/', $controllerName, $matches)) {
                    return Inflector::getInflector()->singularize($matches[1]);
                } else {
                    return null;
                }
        }
    }

    private function getTableFromClassName(?string $controllerName): string
    {
        // Handle special use cases that don't follow the usual rules
        switch ($controllerName) {
            case 'AdminAccess':
                return 'access';
        }

        $objectClassName = $this->getClassName($controllerName);
        if (empty($objectClassName) || !class_exists($objectClassName) || !property_exists($objectClassName, 'definition')) {
            return 'configuration';
        }

        $definition = $objectClassName::$definition;

        return $definition['table'] ?? 'configuration';
    }

    private function getTabId(string $controllerName): int
    {
        try {
            return $this->tabRepository->getIdByClassName($controllerName);
        } catch (NoResultException) {
            return -1;
        }
    }

    private function getMultiShopContext(string $controllerName): int
    {
        if (in_array($controllerName, $this->controllersLockedToAllShopContext)) {
            return ShopConstraint::ALL_SHOPS;
        } else {
            return ShopConstraint::ALL_SHOPS | ShopConstraint::SHOP_GROUP | ShopConstraint::SHOP;
        }
    }

    private function getCurrentIndex(): string
    {
        $parameters = [];
        if (!empty($this->controllerName)) {
            $parameters[] = 'controller=' . $this->controllerName;
        }
        if (!empty($this->redirectionUrl)) {
            $parameters[] = 'back=' . urlencode($this->redirectionUrl);
        }

        return 'index.php' . (!empty($parameters) ? '?' . implode('&', $parameters) : '');
    }
}
